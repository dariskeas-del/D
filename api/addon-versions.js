// api/addon-versions.js — Vercel Node.js Serverless Function
// Muat naik fail addon terus ke Vercel Blob, simpan metadata dalam Redis

import { Redis } from '@upstash/redis';
import { put, del } from '@vercel/blob';
import { randomUUID } from 'crypto';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false // wajib false sebab kita parse multipart/form-data sendiri
  }
};

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

function checkAuth(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Basic ')) return false;
  const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
  const sep = decoded.indexOf(':');
  const email = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);
  return email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD;
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function pick(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'Tidak sah' });

    let fields, files;
    try {
      ({ fields, files } = await parseForm(req));
    } catch (e) {
      return res.status(400).json({ error: 'Data tidak sah' });
    }

    const addonId = pick(fields.addonId);
    const version = pick(fields.version);
    const changelog = pick(fields.changelog) || '';
    const fileObj = pick(files.file);

    if (!addonId || !version || !fileObj) {
      return res.status(400).json({ error: 'Addon, versi dan fail diperlukan' });
    }

    const addons = (await redis.get('addons')) || [];
    const idx = addons.findIndex(a => a.id === addonId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Addon tidak dijumpai' });
    }

    const fileBuffer = fs.readFileSync(fileObj.filepath);
    const originalName = fileObj.originalFilename || 'fail-addon';
    const blobKey = `addons/${addonId}/${randomUUID()}-${originalName}`;
    const blob = await put(blobKey, fileBuffer, { access: 'public' });

    const versionEntry = {
      id: randomUUID(),
      version,
      changelog,
      fileUrl: blob.url,
      fileName: originalName,
      fileSize: fileObj.size,
      uploadedAt: Date.now()
    };

    if (!addons[idx].versions) addons[idx].versions = [];
    addons[idx].versions.unshift(versionEntry);
    await redis.set('addons', addons);

    return res.status(200).json(versionEntry);
  }

  if (req.method === 'DELETE') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'Tidak sah' });
    const { addonId, versionId } = req.query;

    const addons = (await redis.get('addons')) || [];
    const idx = addons.findIndex(a => a.id === addonId);
    if (idx === -1) return res.status(404).json({ error: 'Addon tidak dijumpai' });

    const versions = addons[idx].versions || [];
    const vIdx = versions.findIndex(v => v.id === versionId);
    if (vIdx === -1) return res.status(404).json({ error: 'Versi tidak dijumpai' });

    const fileUrl = versions[vIdx].fileUrl;
    try { await del(fileUrl); } catch (e) {}
    versions.splice(vIdx, 1);
    addons[idx].versions = versions;
    await redis.set('addons', addons);

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Kaedah tidak disokong' });
}
