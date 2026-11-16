import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { User } from '../../src/models/User.js';
import { Category } from '../../src/models/Category.js';
import { Transaction } from '../../src/models/Transaction.js';
import { Budget } from '../../src/models/Budget.js';
import { AssistantMessage } from '../../src/models/AssistantMessage.js';
import { Post } from '../../src/models/Post.js';
import { Comment } from '../../src/models/Comment.js';
import { Reaction } from '../../src/models/Reaction.js';
import { WatchlistItem } from '../../src/models/WatchlistItem.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dir = path.join(root, 'docs/report/diagrams');
const read = (file) => fs.readFileSync(path.join(dir, file), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(read('kosha-model.js'), sandbox);
const model = sandbox.window.KOSHA_MODEL;

const MODELS = { User, Category, Transaction, Budget, AssistantMessage, Post, Comment, Reaction, WatchlistItem };
const indexKey = (fields) => Object.entries(fields).map(([k, v]) => (v === 1 ? k : `${k}:${v}`)).join(', ');

describe('The data-flow and schema page stays true to the code', () => {
  it('describes every collection, with the name Mongoose really gives it', () => {
    expect(model.collections.map((c) => c.model).sort()).toEqual(Object.keys(MODELS).sort());
    for (const c of model.collections) expect(MODELS[c.model].collection.collectionName, c.model).toBe(c.name);
  });

  it('lists exactly the fields each model has (top level), no more and no fewer', () => {
    for (const c of model.collections) {
      const real = Object.keys(MODELS[c.model].schema.paths).map((p) => p.split('.')[0]).filter((p) => p !== '_id' && p !== '__v');
      expect([...new Set(c.fields.map((f) => f.f))].sort(), c.model).toEqual([...new Set(real)].sort());
    }
  });

  it('agrees with the schema on which fields are required and which are references', () => {
    for (const c of model.collections) {
      const paths = MODELS[c.model].schema.paths;
      for (const f of c.fields) {
        const path = paths[f.f];
        const flags = (f.flags ?? '').split(' ');
        expect(flags.includes('r'), `${c.model}.${f.f} required`).toBe(Boolean(path.isRequired));
        expect(flags.includes('k'), `${c.model}.${f.f} reference`).toBe(Boolean(path.options?.ref));
        if (flags.includes('k')) expect(f.ref, `${c.model}.${f.f} points at`).toBeTruthy();
      }
    }
  });

  it('lists the indexes each model really has', () => {
    for (const c of model.collections) {
      const real = MODELS[c.model].schema.indexes().map(([fields, options]) => `${indexKey(fields)}|${options?.unique ? 'unique' : ''}`).sort();
      const documented = c.indexes.map((i) => `${i.on.replace(/:-1/g, ':-1')}|${i.unique ? 'unique' : ''}`).sort();
      expect(documented, c.model).toEqual(real);
    }
  });

  it('draws a process for every part of the API, and says where each one works', () => {
    const mounts = [...fs.readFileSync(path.join(root, 'server/src/routes/index.js'), 'utf8').matchAll(/router\.use\('\/(\w+)'/g)].map((m) => m[1]).sort();
    const covered = Object.values(model.processes).flatMap((p) => p.routes).sort();
    expect(covered).toEqual(mounts);
  });

  it('points every flow at something that exists, at every level', () => {
    for (const [name, level] of Object.entries(model.levels)) {
      const ids = new Set(level.nodes.map((n) => n[0]));
      for (const [from, to, label] of level.flows) {
        expect(ids.has(from), `${name}: ${from}`).toBe(true);
        expect(ids.has(to), `${name}: ${to}`).toBe(true);
        expect(label.length, `${name}: ${from} to ${to}`).toBeGreaterThan(3);
      }
      for (const n of level.nodes) {
        const known = { external: model.externals, process: model.processes, store: model.stores }[n[1]];
        expect(Boolean(known[n[0]] || n[6]), `${name}: ${n[0]} has a description`).toBe(true);
      }
    }
  });

  it('gives every process in the diagrams something coming in and something going out', () => {
    for (const [name, level] of Object.entries(model.levels)) {
      for (const n of level.nodes.filter((x) => x[1] === 'process')) {
        expect(level.flows.some((f) => f[1] === n[0]), `${name}: nothing flows into ${n[0]}`).toBe(true);
        expect(level.flows.some((f) => f[0] === n[0]), `${name}: nothing flows out of ${n[0]}`).toBe(true);
      }
    }
  });

  it('keeps stores to the collections that exist, and says so for the one that is not in the database', () => {
    const names = new Set(model.collections.map((c) => c.name));
    for (const s of Object.values(model.stores)) {
      if (s.collection) expect(names.has(s.collection), s.label).toBe(true);
      else expect(s.note).toMatch(/not in the database/i);
    }
  });

  it('is a page of HTML, CSS and JavaScript that depend on nothing from the network', () => {
    const html = read('dfd-and-schema.html');
    expect(html).toMatch(/<link[^>]+dfd-and-schema\.css/);
    expect(html).toMatch(/<script[^>]+kosha-model\.js/);
    expect(html).toMatch(/<script[^>]+dfd-and-schema\.js/);
    for (const file of ['dfd-and-schema.html', 'dfd-and-schema.css', 'dfd-and-schema.js']) {
      expect(read(file), file).not.toMatch(/https?:\/\/(?!www\.w3\.org)/); // no CDN, no fonts, no remote anything
    }
  });
});
