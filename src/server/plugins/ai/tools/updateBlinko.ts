import { userCaller } from '@/server/routers/_app';
import { NoteType } from '@/server/types';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const updateBlinkoTool = createTool({
  id: 'update-blinko-tool',
  description: 'you are a blinko assistant,you can use api to batch update blinko,save to database',
  //@ts-ignore
  inputSchema: z.object({
    notes: z.array(z.object({
      id: z.number(),
      content: z.string(),
      type: z.union([z.nativeEnum(NoteType), z.literal(-1)]).default(-1),
      isArchived: z.union([z.boolean(), z.null()]).default(null),
      isTop: z.union([z.boolean(), z.null()]).default(null),
      isShare: z.union([z.boolean(), z.null()]).default(null),
      isRecycle: z.union([z.boolean(), z.null()]).default(null),
    })),
    accountId: z.number()
  }),
  execute: async ({ context }) => {
    try {
      const caller = userCaller({
        id: context.accountId.toString(),
        exp: 0,
        iat: 0,
        name: 'admin',
        sub: context.accountId.toString(),
        role: 'superadmin'
      })
      return await Promise.all(context.notes.map(async (note, index) => {
        return caller.notes.upsert({
          content: note.content,
          type: NoteType.BLINKO,
          id: note.id
        })
      }))
    } catch (error) {
      console.log(error)
      return error.message
    }
  }
});