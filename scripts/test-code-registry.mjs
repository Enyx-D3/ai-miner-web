import assert from 'node:assert/strict';
import {
  CODE_REGISTRY_RULE_VERSION, allArchivedCodeMessages, codeFromFences, languageForFilename,
  safeCodeContent, safeSourcePath, selectCodeFilesFromLibraryMetadata, sourcePathForFence,
} from '../src/lib/brain2/codeRegistryCore.ts';
import { codeRecordTreePath, groupCodeByProject } from '../src/lib/brain2/codeRegistryTree.ts';

assert.equal(CODE_REGISTRY_RULE_VERSION, 'B2_CODE_REGISTRY_V2');
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
assert.equal(first[0].fileName, 'unnamed-1.dart');
assert.equal(first[1].language, 'python');
assert.equal(first.every((entry) => entry.conversationExternalId === 'c1'), true);

assert.equal(sourcePathForFence('tsx filename="src/app/page.tsx"', '', 'export default function Page() {}'), 'src/app/page.tsx');
assert.equal(sourcePathForFence('dart title=lib/screens/home.dart', '', 'class Home {}'), 'lib/screens/home.dart');
assert.equal(sourcePathForFence('src/main.py', '', 'def main(): pass'), 'src/main.py');
assert.equal(sourcePathForFence('python', '### File: `tools/analyze.py`\n', 'def run(): pass'), 'tools/analyze.py');
assert.equal(sourcePathForFence('ts', '**`src/lib/utils.ts`**\n', 'export const run = 1;'), 'src/lib/utils.ts');
assert.equal(sourcePathForFence('kt', '', '// File: app/src/main/MainActivity.kt\nclass MainActivity {}'), 'app/src/main/MainActivity.kt');
assert.equal(sourcePathForFence('python filename="../../.env"', '', 'def f(): pass'), null);
assert.equal(sourcePathForFence('python', 'This module uses src/other.py in a paragraph.\n', 'def f(): pass'), null);
const named = codeFromFences({ ...input, messages: [
  {externalId:'m3',role:'assistant',text:'### File: `lib/main.dart`\n```dart\nvoid main() {}\n```\n\n```tsx filename="src/app/page.tsx"\nexport default function Page() {}\n```'},
] });
assert.deepEqual(named.map(x => [x.fileName, x.sourcePath]), [['main.dart','lib/main.dart'],['page.tsx','src/app/page.tsx']]);
assert.deepEqual(codeFromFences({ ...input, messages: [{externalId:'m3',role:'assistant',text:'### File: `lib/main.dart`\n```dart\nvoid main() {}\n```'}] }),
  codeFromFences({ ...input, messages: [{externalId:'m3',role:'assistant',text:'### File: `lib/main.dart`\n```dart\nvoid main() {}\n```'}] }),
  'named source recovery must be deterministic');

const record = (id, projectName, projectId, fileName, sourcePath, origin = 'CHAT_FENCE') => ({
  id, projectName, projectId, fileName, sourcePath, origin, conversationExternalId:'c1', sourceMessageId:'m1',
  conversationTitle:'Implementation', language:'dart', provider:'chatgpt', hash:id,
});
const archived = [
  record('r1','PeerDrop','pd','main.dart','lib/main.dart'),
  record('r2','PeerDrop','pd','main.dart','lib/main.dart'),
  record('r3','PeerDrop','pd','MainActivity.kt','android.zip:android/app/src/main/MainActivity.kt','NESTED_ARCHIVE_FILE'),
  record('r4','MRS Lite','mrs','snippet-1.dart',''),
];
assert.equal(codeRecordTreePath(archived[2]), 'android.zip/android/app/src/main/MainActivity.kt');
assert.equal(codeRecordTreePath(archived[3]), 'Unidentified/c1/m1/unnamed-1.dart');
const tree = groupCodeByProject(archived);
assert.deepEqual(tree, groupCodeByProject([...archived].reverse()), 'project folder tree must not depend on input order');
assert.deepEqual(tree.map(x => x.name), ['MRS Lite', 'PeerDrop']);
assert.equal(tree[1].root.folders.find(x => x.name === 'lib')?.files[0].records.length, 2, 'same original file keeps both source revisions');
assert.equal(tree[1].root.folders.find(x => x.name === 'android.zip')?.folders[0].name, 'android');
const branched = allArchivedCodeMessages({ mapping: {
  'node-z': { message: { id: 'z', author: { role: 'assistant' }, content: { parts: ['```cpp\nint main() { return 0; }\n```'] } } },
  'node-a': { message: { id: 'a', author: { role: 'assistant' }, content: { parts: ['```py\nprint(1)\n```'] } } },
}}, []);
assert.deepEqual(branched.map(x => x.externalId), ['a', 'z'], 'all branch source ids must have stable order');
assert.equal(codeFromFences({ ...input, messages: branched }).length, 2);

console.log('Code Registry deterministic extraction: PASS (security, metadata, provenance, reproducibility)');
