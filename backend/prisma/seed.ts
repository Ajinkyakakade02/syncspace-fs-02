import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as Y from 'yjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SyncSpace database seed...');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // 1. Create Demo Users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@syncspace.io' },
    update: {},
    create: {
      email: 'alice@syncspace.io',
      name: 'Alice Cooper (Owner)',
      passwordHash,
      cursorColor: '#3b82f6', // Blue
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@syncspace.io' },
    update: {},
    create: {
      email: 'bob@syncspace.io',
      name: 'Bob Miller (Editor)',
      passwordHash,
      cursorColor: '#10b981', // Emerald
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@syncspace.io' },
    update: {},
    create: {
      email: 'charlie@syncspace.io',
      name: 'Charlie Smith (Viewer)',
      passwordHash,
      cursorColor: '#f59e0b', // Amber
    },
  });

  console.log('✅ Demo users created:', { alice: alice.email, bob: bob.email, charlie: charlie.email });

  // 2. Create Shared Demo Workspace
  let workspace = await prisma.workspace.findFirst({
    where: { name: 'Acme Product Team' },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Acme Product Team',
        description: 'Next-generation real-time document collaboration workspace',
        ownerId: alice.id,
        members: {
          create: [
            { userId: alice.id, role: Role.OWNER },
            { userId: bob.id, role: Role.EDITOR },
            { userId: charlie.id, role: Role.VIEWER },
          ],
        },
      },
    });
  }

  // Helper to create an initial Y.Doc snapshot with XML fragment
  const createInitialYjsSnapshot = (textParagraph: string): Buffer => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('default');
    const p = new Y.XmlElement('paragraph');
    const text = new Y.XmlText(textParagraph);
    p.insert(0, [text]);
    fragment.insert(0, [p]);
    const snapshot = Buffer.from(Y.encodeStateAsUpdate(doc));
    doc.destroy();
    return snapshot;
  };

  // 3. Create Sample Pages
  const page1 = await prisma.page.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      workspaceId: workspace.id,
      title: 'Welcome to SyncSpace 🚀',
      icon: '✨',
      order: 0,
      createdById: alice.id,
      lastEditedById: bob.id,
      collaborationGeneration: 1,
      collaborationDocuments: {
        create: {
          generation: 1,
          snapshot: createInitialYjsSnapshot(
            'SyncSpace brings Notion and Figma style real-time collaboration with conflict-free replicated data types (CRDTs). Start typing or invite a teammate to see live cursors!'
          ),
        },
      },
    },
  });

  const page2 = await prisma.page.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      workspaceId: workspace.id,
      title: 'CRDT & Real-Time Synchronization Notes ⚡',
      icon: '🧠',
      order: 1,
      createdById: alice.id,
      lastEditedById: alice.id,
      collaborationGeneration: 1,
      collaborationDocuments: {
        create: {
          generation: 1,
          snapshot: createInitialYjsSnapshot(
            'Yjs guarantees mathematical convergence without requiring an authoritative locking server. Edits can happen concurrently and offline.'
          ),
        },
      },
    },
  });

  // Add initial sample comment
  await prisma.comment.create({
    data: {
      pageId: page1.id,
      authorId: bob.id,
      content: 'This collaborative editor feels super responsive! Live cursors look great.',
      replies: {
        create: {
          authorId: alice.id,
          content: 'Thanks Bob! The Yjs CRDT ensures zero conflicts even when we edit together.',
        },
      },
    },
  });

  console.log('✅ Seed complete with demo pages and comments.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
