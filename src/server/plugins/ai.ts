import 'pdf-parse';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { prisma } from '../prisma';
import { AiModelFactory } from './ai/aiModelFactory';
import { ProgressResult } from './memos';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { UnstructuredLoader } from '@langchain/community/document_loaders/fs/unstructured';
import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { FileService } from './files';
import { Context } from '../context';
import { CreateNotification } from '../routers/notification';
import { NotificationType } from '@/lib/prismaZodType';
import { CoreMessage } from '@mastra/core';
import { MDocument } from '@mastra/rag';
import { embed, embedMany } from 'ai';
import { RebuildEmbeddingJob } from './rebuildEmbeddingJob';
import { LibSQLVector } from '@mastra/core/vector/libsql';
//https://js.langchain.com/docs/introduction/
//https://smith.langchain.com/onboarding
//https://js.langchain.com/docs/tutorials/qa_chat_history

export function isImage(filePath: string): boolean {
  if (!filePath) return false;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  return imageExtensions.some((ext) => filePath.toLowerCase().endsWith(ext));
}

export class AiService {
  static isImage = isImage;

  static async loadFileContent(filePath: string): Promise<string> {
    try {
      let loader: BaseDocumentLoader;
      switch (true) {
        case filePath.endsWith('.pdf'):
          loader = new PDFLoader(filePath);
          break;
        case filePath.endsWith('.docx') || filePath.endsWith('.doc'):
          loader = new DocxLoader(filePath);
          break;
        case filePath.endsWith('.txt'):
          loader = new TextLoader(filePath);
          break;
        case filePath.endsWith('.csv'):
          console.log('load csv');
          loader = new CSVLoader(filePath);
          break;
        default:
          loader = new UnstructuredLoader(filePath);
      }
      const docs = await loader.load();
      return docs.map((doc) => doc.pageContent).join('\n');
    } catch (error) {
      console.error('File loading error:', error);
      throw new Error(`can not load file: ${filePath}`);
    }
    return '';
  }

  static async embeddingDeleteAll(id: number, VectorStore: LibSQLVector) {
    await VectorStore.truncateIndex('blinko');
  }

  static async embeddingDeleteAllAttachments(filePath: string, VectorStore: LibSQLVector) {
    await VectorStore.truncateIndex('blinko');
  }

  static async embeddingUpsert({ id, content, type, createTime, updatedAt }: { id: number; content: string; type: 'update' | 'insert'; createTime: Date; updatedAt?: Date }) {
    try {
      const { VectorStore, Embeddings } = await AiModelFactory.GetProvider();
      const config = await AiModelFactory.globalConfig();

      if (config.excludeEmbeddingTagId) {
        const tag = await prisma.tag.findUnique({ where: { id: config.excludeEmbeddingTagId } });
        if (tag && content.includes(tag.name)) {
          console.warn('this note is not allowed to be embedded:', tag.name);
          return { ok: true, msg: 'tag is not allowed to be embedded' };
        }
      }

      const chunks = await MDocument.fromMarkdown(content).chunk();
      if (type == 'update') {
        AiModelFactory.queryAndDeleteVectorById(id);
      }

      const { embeddings } = await embedMany({
        values: chunks.map((chunk) => chunk.text + 'Create At: ' + createTime.toISOString() + ' Update At: ' + updatedAt?.toISOString()),
        model: Embeddings,
      });

      await VectorStore.upsert(
        'blinko',
        embeddings,
        chunks?.map((chunk) => ({ text: chunk.text, id, noteId: id, createTime, updatedAt })),
      );

      try {
        await prisma.notes.update({
          where: { id },
          data: {
            metadata: {
              isIndexed: true,
            },
            updatedAt,
          },
        });
      } catch (error) {
        console.log(error);
      }

      return { ok: true };
    } catch (error) {
      console.log(error, 'embeddingUpsert error');
      return { ok: false, error: error?.message };
    }
  }

  //api/file/123.pdf
  static async embeddingInsertAttachments({ id, updatedAt, filePath }: { id: number; updatedAt?: Date; filePath: string }) {
    try {
      const absolutePath = await FileService.getFile(filePath);
      const content = await AiService.loadFileContent(absolutePath);
      const { VectorStore, TokenTextSplitter, Embeddings } = await AiModelFactory.GetProvider();

      const doc = MDocument.fromText(content);
      const chunks = await doc.chunk();

      const { embeddings } = await embedMany({
        values: chunks.map((chunk) => chunk.text + 'Create At: ' + updatedAt?.toISOString() + ' Update At: ' + updatedAt?.toISOString()),
        model: Embeddings,
      });

      await VectorStore.upsert(
        'blinko',
        embeddings,
        chunks?.map((chunk) => ({ text: chunk.text, id, noteId: id, isAttachment: true, updatedAt })),
      );

      try {
        await prisma.notes.update({
          where: { id },
          data: {
            metadata: {
              isIndexed: true,
              isAttachmentsIndexed: true,
            },
            updatedAt,
          },
        });
      } catch (error) {
        console.log(error);
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  static async embeddingDelete({ id }: { id: number }) {
    AiModelFactory.queryAndDeleteVectorById(id);
    return { ok: true };
  }

  static async *rebuildEmbeddingIndex({ force = false }: { force?: boolean }): AsyncGenerator<ProgressResult & { progress?: { current: number; total: number } }, void, unknown> {
    // This method is now a wrapper around the RebuildEmbeddingJob
    // We'll just return a simple message directing to use the job instead
    yield {
      type: 'info' as const,
      content: 'Rebuild embedding index task started - check task progress for details',
      progress: { current: 0, total: 0 },
    };

    // Start the job
    await RebuildEmbeddingJob.ForceRebuild(force);
  }

  static getChatHistory({ conversations }: { conversations: { role: string; content: string }[] }) {
    const conversationMessage = conversations.map((i) => {
      if (i.role == 'user') {
        return new HumanMessage(i.content);
      }
      return new AIMessage(i.content);
    });
    conversationMessage.pop();
    return conversationMessage;
  }

  static async enhanceQuery({ query, ctx }: { query: string; ctx: Context }) {
    const { VectorStore, Embeddings } = await AiModelFactory.GetProvider();
    const config = await AiModelFactory.globalConfig();

    const { embedding } = await embed({
      value: query,
      model: Embeddings,
    });

    const results = await VectorStore.query('blinko', embedding, 20);

    const DISTANCE_THRESHOLD = config.embeddingScore ?? 0.3;

    const filteredResultsWithScore = results
      .filter(({ score }) => score > DISTANCE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .map(({ metadata, score }) => ({
        metadata,
        score,
      }));

    console.log(filteredResultsWithScore, 'filteredResultsWithScore');

    const notes = await prisma.notes.findMany({
      where: {
        id: { in: filteredResultsWithScore.map((i) => i.metadata?.id).filter((i) => !!i) },
        accountId: Number(ctx.id),
      },
      include: {
        tags: { include: { tag: true } },
        attachments: true,
        _count: {
          select: {
            comments: true,
            histories: true,
          },
        },
      },
    });
    const sortedNotes = notes.sort((a, b) => {
      const scoreA = filteredResultsWithScore.find((r) => r.metadata?.id === a.id)?.score ?? Infinity;
      const scoreB = filteredResultsWithScore.find((r) => r.metadata?.id === b.id)?.score ?? Infinity;
      return scoreB - scoreA;
    });
    console.log(sortedNotes, 'sortedNotes');
    return sortedNotes;
  }

  static async completions({
    question,
    conversations,
    withTools,
    withRAG = true,
    withOnline = false,
    systemPrompt,
    ctx,
  }: {
    question: string;
    conversations: CoreMessage[];
    withTools?: boolean;
    withRAG?: boolean;
    withOnline?: boolean;
    systemPrompt?: string;
    ctx: Context;
  }) {
    try {
      console.log('completions');
      conversations.push({
        role: 'user',
        content: question,
      });
      conversations.push({
        role: 'system',
        content: `Current userId: ${ctx.id}\n Current user name: ${ctx.name}\n`,
      });
      if (systemPrompt) {
        conversations.push({
          role: 'system',
          content: systemPrompt,
        });
      }
      let ragNote: any[] = [];
      if (withRAG) {
        let { notes, aiContext } = await AiModelFactory.queryVector(question, Number(ctx.id));
        ragNote = notes;
        conversations.push({
          role: 'system',
          content: `This is the note content ${ragNote.map((i) => i.content).join('\n')} ${aiContext}`,
        });
      }
      console.log(conversations, 'conversations');
      const agent = await AiModelFactory.BaseChatAgent({ withTools, withOnlineSearch: withOnline });
      const result = await agent.stream(conversations);
      return { result, notes: ragNote };
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  static async AIComment({ content, noteId }: { content: string; noteId: number }) {
    try {
      const note = await prisma.notes.findUnique({
        where: { id: noteId },
        select: { content: true, accountId: true },
      });

      if (!note) {
        throw new Error('Note not found');
      }

      const agent = await AiModelFactory.CommentAgent();
      const result = await agent.generate([
        {
          role: 'user',
          content: content,
        },
        {
          role: 'user',
          content: `This is the note content: ${note.content}`,
        },
      ]);

      const comment = await prisma.comments.create({
        data: {
          content: result.text.trim(),
          noteId,
          guestName: 'Blinko AI',
          guestIP: '',
          guestUA: '',
        },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              nickname: true,
              image: true,
            },
          },
        },
      });
      await CreateNotification({
        accountId: note.accountId ?? 0,
        title: 'comment-notification',
        content: 'comment-notification',
        type: NotificationType.COMMENT,
      });
      return comment;
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }
}
