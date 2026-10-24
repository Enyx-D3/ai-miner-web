import assert from 'node:assert/strict';
import {
  CODE_REGISTRY_RULE_VERSION, allArchivedCodeMessages, codeFromFences, languageForFilename,
  safeCodeContent, safeSourcePath, selectCodeFilesFromLibraryMetadata,
} from '../src/lib/brain2/codeRegistryCore.ts';

assert.equal(CODE_REGISTRY_RULE_VERSION, 'B2_CODE_REGISTRY_V1');
assert.equal(languageForFilename('lib/background_transcriber.dart'), 'dart');
assert.equal(languageForFilename('sample.jks'), null);
assert.equal(safeSourcePath('android/app/src/main/MainActivity.kt'), true);
assert.equal(safeSourcePath('../secrets/key.properties'), false);
assert.equal(safeSourcePath('android/autolist_release-key.jks'), false);
assert.equal(safeSourcePath('node_modules/pkg/index.js'), false);
assert.equal(safeCodeContent('-----BEGIN PRIVATE KEY-----\nsecret'), false);

const metadata = selectCodeFilesFromLibraryMetadata([
  { file_id: 'f1', file_name: 'model_downloader.dart', file_extension: 'dart', file_size_bytes: 150, origination_thread_id: 'c1' },
  { file_id: 'f2', file_name: 'android.zip', file_extension: 'zip', file_size_bytes: 120000, origination_thread_id: 'c1' },
  { file_id: 'f3', file_name: 'key.properties', file_extension: 'properties', file_size_bytes: 200 },
  { file_id: 'f4', file_name: '../escape.py', file_extension: 'py', file_size_bytes: 30 },
  { file_id: 'f5', file_name: 'report.pdf', file_extension: 'pdf', file_size_bytes: 1000 },
]);
assert.deepEqual(metadata.map((entry) => entry.fileId), ['f1','f2']);

const input = { provider: 'chatgpt', projectId: 'P1', projectName: 'LLM Player', conversationExternalId: 'c1', conversationTitle: 'Loader issues', messages: [
  { externalId: 'm1', role: 'user', text: '```dart\nvoid main() {}\n```\n```mermaid\nflowchart LR\n```' },
  { externalId: 'm2', role: 'assistant', text: '```python\ndef main():\n  return 42\n```' },
] };
const first = codeFromFences(input);
const second = codeFromFences(input);
assert.deepEqual(first, second, 'exact input must give identical snippets');
assert.equal(first.length, 2);
assert.equal(first[0].fileName, 'snippet-1.dart');
assert.equal(first[1].language, 'python');
assert.equal(first.every((entry) => entry.conversationExternalId === 'c1'), true);
const branched = allArchivedCodeMessages({ mapping: {
  'node-z': { message: { id: 'z', author: { role: 'assistant' }, content: { parts: ['```cpp\nint main() { return 0; }\n```'] } } },
  'node-a': { message: { id: 'a', author: { role: 'assistant' }, content: { parts: ['```py\nprint(1)\n```'] } } },
}}, []);
assert.deepEqual(branched.map(x => x.externalId), ['a', 'z'], 'all branch source ids must have stable order');
assert.equal(codeFromFences({ ...input, messages: branched }).length, 2);

console.log('Code Registry deterministic extraction: PASS (security, metadata, provenance, reproducibility)');
