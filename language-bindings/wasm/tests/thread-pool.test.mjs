// Thread pool size. The threaded build starts its pthread pool when the module
// loads. The size must go from the `ort_intra_op_threads` option to the module
// arguments. These tests use a fake Emscripten factory, so they need no wasm
// binary and no model.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { DIST } from './helpers.mjs';

const {
  loadMoonshineModule,
  moduleOptionsForNativeOptions,
  resetMoonshineModule,
  threadPoolSizeForOptions,
} = await import(path.join(DIST, 'module.js'));
const { MicTranscriber } = await import(path.join(DIST, 'mic-transcriber.js'));

test('threadPoolSizeForOptions reads ort_intra_op_threads', () => {
  assert.equal(threadPoolSizeForOptions({ ort_intra_op_threads: '2' }), 2);
});

test('threadPoolSizeForOptions returns undefined when the pool size is not set', () => {
  assert.equal(threadPoolSizeForOptions(undefined), undefined);
  assert.equal(threadPoolSizeForOptions({}), undefined);
  assert.equal(threadPoolSizeForOptions({ ort_intra_op_threads: '0' }), undefined);
  assert.equal(threadPoolSizeForOptions({ ort_intra_op_threads: 'many' }), undefined);
});

test('moduleOptionsForNativeOptions fills in the pool size', () => {
  const locateFile = (file) => file;
  const merged = moduleOptionsForNativeOptions({ locateFile }, { ort_intra_op_threads: '2' });
  assert.equal(merged.threadPoolSize, 2);
  assert.equal(merged.locateFile, locateFile);
});

test('moduleOptionsForNativeOptions keeps an explicit threadPoolSize', () => {
  const merged = moduleOptionsForNativeOptions(
    { threadPoolSize: 4 },
    { ort_intra_op_threads: '2' },
  );
  assert.equal(merged.threadPoolSize, 4);
});

test('moduleOptionsForNativeOptions changes nothing without the option', () => {
  const moduleOptions = { locateFile: (file) => file };
  assert.equal(moduleOptionsForNativeOptions(moduleOptions, {}), moduleOptions);
  assert.equal(moduleOptionsForNativeOptions(undefined, undefined), undefined);
});

test('loadMoonshineModule passes the pool size to the module as pthreadPoolSize', async () => {
  resetMoonshineModule();
  let receivedArgs;
  const factory = async (args) => {
    receivedArgs = args;
    return {};
  };
  await loadMoonshineModule({ factory, threadPoolSize: 2 });
  assert.equal(receivedArgs.pthreadPoolSize, 2);
  resetMoonshineModule();
});

test('loadMoonshineModule does not set pthreadPoolSize by default', async () => {
  resetMoonshineModule();
  let receivedArgs;
  const factory = async (args) => {
    receivedArgs = args;
    return {};
  };
  await loadMoonshineModule({ factory });
  assert.equal('pthreadPoolSize' in receivedArgs, false);
  resetMoonshineModule();
});

test('MicTranscriber.threads rejects a count that is not a positive integer', () => {
  for (const bad of [0, -1, 1.5, Number.NaN]) {
    assert.throws(() => new MicTranscriber().threads(bad), /positive integer/);
  }
});

test('MicTranscriber.threads and allowSpinning chain', () => {
  const mic = new MicTranscriber();
  assert.equal(mic.threads(2).allowSpinning(false), mic);
});
