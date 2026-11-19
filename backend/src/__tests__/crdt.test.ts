import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';

describe('Yjs CRDT Mathematical Convergence & Conflict-Free Resolution', () => {
  it('should converge when two users type at the beginning and end simultaneously', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const textA = docA.getText('content');
    const textB = docB.getText('content');

    // Initial synchronized state
    textA.insert(0, 'Hello World');
    const initUpdate = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docB, initUpdate);

    expect(textA.toString()).toBe('Hello World');
    expect(textB.toString()).toBe('Hello World');

    // User A inserts at position 0: "Awesome " -> "Awesome Hello World"
    textA.insert(0, 'Awesome ');

    // User B simultaneously appends at position 11: " from SyncSpace!" -> "Hello World from SyncSpace!"
    textB.insert(11, ' from SyncSpace!');

    // Exchange updates
    const updateFromA = Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB));
    const updateFromB = Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA));

    Y.applyUpdate(docB, updateFromA);
    Y.applyUpdate(docA, updateFromB);

    // Both documents must converge to the exact same text without conflicts!
    expect(textA.toString()).toBe('Awesome Hello World from SyncSpace!');
    expect(textB.toString()).toBe('Awesome Hello World from SyncSpace!');
    expect(textA.toString()).toBe(textB.toString());
  });

  it('should resolve concurrent character insertions at the exact same position', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const text1 = doc1.getText('text');
    const text2 = doc2.getText('text');

    // Both clients concurrently insert at index 0 on an empty doc
    text1.insert(0, 'Client 1 Edits. ');
    text2.insert(0, 'Client 2 Edits. ');

    // Cross-apply updates
    const u1 = Y.encodeStateAsUpdate(doc1);
    const u2 = Y.encodeStateAsUpdate(doc2);

    Y.applyUpdate(doc2, u1);
    Y.applyUpdate(doc1, u2);

    // State must be 100% identical on both clients
    expect(text1.toString()).toBe(text2.toString());
  });

  it('should handle XML fragments and rich text formatting concurrently', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const fragmentA = docA.getXmlFragment('prosemirror');
    const fragmentB = docB.getXmlFragment('prosemirror');

    const pA = new Y.XmlElement('paragraph');
    const textA = new Y.XmlText('Rich Text Collaboration');
    pA.insert(0, [textA]);
    fragmentA.insert(0, [pA]);

    // Sync B with A
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    expect(fragmentA.toString()).toBe(fragmentB.toString());

    // Concurrently add formatting and another paragraph
    textA.format(0, 4, { bold: true });

    const pB = new Y.XmlElement('paragraph');
    const textB = new Y.XmlText('Second paragraph from collaborator');
    pB.insert(0, [textB]);
    fragmentB.insert(1, [pB]);

    // Exchange updates
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));

    expect(fragmentA.toString()).toBe(fragmentB.toString());
  });

  it('should correctly encode state vectors and compute delta updates', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const ytext1 = doc1.getText('notes');
    ytext1.insert(0, 'Initial base document');

    // Doc 2 has received base document
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));

    // Doc 1 adds incremental change
    ytext1.insert(ytext1.length, ' - Added increment');

    // Compute differential update using Doc 2's state vector
    const stateVector2 = Y.encodeStateVector(doc2);
    const diffUpdate = Y.encodeStateAsUpdate(doc1, stateVector2);

    // Size of diffUpdate should only contain the increment, not the entire doc
    expect(diffUpdate.byteLength).toBeLessThan(Y.encodeStateAsUpdate(doc1).byteLength);

    Y.applyUpdate(doc2, diffUpdate);
    expect(doc2.getText('notes').toString()).toBe('Initial base document - Added increment');
  });
});
