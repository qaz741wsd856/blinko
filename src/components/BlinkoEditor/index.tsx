import { observer } from "mobx-react-lite"
import Editor from "../Common/Editor"
import { RootStore } from "@/store"
import { BlinkoStore } from "@/store/blinkoStore"
import dayjs from "@/lib/dayjs"
import { useEffect, useRef } from "react"
import { NoteType } from "@/server/types"
import { useRouter } from "next/router"
import { HandleFileType } from "../Common/Editor/editorUtils"
type IProps = {
  mode: 'create' | 'edit',
  onSended?: () => void,
  onHeightChange?: (height: number) => void,
  height?: number,
  isInDialog?: boolean
}

export const BlinkoEditor = observer(({ mode, onSended, onHeightChange, isInDialog }: IProps) => {
  const isCreateMode = mode == 'create'
  const blinko = RootStore.Get(BlinkoStore)
  const editorRef = useRef<any>(null)
  const router = useRouter()

  const store = RootStore.Local(() => ({
    get noteContent() {
      if (isCreateMode) {
        const local = blinko.createContentStorage.value
        const blinkoContent = blinko.noteContent
        return local?.content != '' ? local?.content : blinkoContent
      } else {
        const local = blinko.editContentStorage.list.find(i => Number(i.id) == Number(blinko.curSelectedNote!.id))
        const blinkoContent = blinko.curSelectedNote?.content ?? ''
        return local?.content != '' ? (local?.content ?? blinkoContent) : blinkoContent
      }
    },
    set noteContent(v: string) {
      if (isCreateMode) {
        blinko.noteContent = v
        blinko.createContentStorage.save({ content: v })
      } else {
        blinko.curSelectedNote!.content = v
        const hasLocal = blinko.editContentStorage.list.find(i => Number(i.id) == Number(blinko.curSelectedNote!.id))
        if (hasLocal) {
          hasLocal.content = v
          blinko.editContentStorage.save()
        } else {
          blinko.editContentStorage.push({ content: v, id: Number(blinko.curSelectedNote!.id) })
        }
      }
    },
    get files(): any {
      if (mode == 'create') {
        const attachments = blinko.createAttachmentsStorage.list
        if (attachments.length) {
          return (attachments)
        } else {
          return []
        }
      } else {
        return blinko.curSelectedNote?.attachments
        // const attachments = blinko.editAttachmentsStorage.list.filter(i => Number(i.id) == Number(blinko.curSelectedNote!.id))
        // if (attachments?.length) {
        //   return attachments
        // } else {
        //   return blinko.curSelectedNote?.attachments
        // }
      }
    }
  }))

  useEffect(() => {
    blinko.isCreateMode = mode == 'create'
    if (mode == 'create') {
      if (isInDialog) {
        document.documentElement.style.setProperty('--min-editor-height', `50vh`)
      }
      const local = blinko.createContentStorage.value
      if (local && local.content != '') {
        blinko.noteContent = local.content
      }
    } else {
      document.documentElement.style.setProperty('--min-editor-height', `unset`)
      const local = blinko.editContentStorage.list.find(i => Number(i.id) == Number(blinko.curSelectedNote!.id))
      if (local && local?.content != '') {
        blinko.curSelectedNote!.content = local!.content
      }
    }
  }, [mode])

  return <div className="max-h-[100vh]" ref={editorRef} id='global-editor' onClick={() => {
    blinko.isCreateMode = mode == 'create'
  }}>
    <Editor
      mode={mode}
      originFiles={store.files}
      originReference={!isCreateMode ? blinko.curSelectedNote?.references?.map(i => i.toNoteId) : []}
      content={store.noteContent}
      onChange={v => {
        store.noteContent = v
      }}
      onHeightChange={() => {
        onHeightChange?.(editorRef.current?.clientHeight ?? 75)
      }}
      isSendLoading={blinko.upsertNote.loading.value}
      bottomSlot={
        isCreateMode ? <div className='text-xs text-ignore ml-2'>Drop to upload files</div> :
          <div className='text-xs text-desc'>{dayjs(blinko.curSelectedNote!.createdAt).format("YYYY-MM-DD hh:mm:ss")}</div>
      }
      onSend={async ({ files, references, noteType }) => {
        if (isCreateMode) {
          console.log("createMode", files, references, noteType)
          //@ts-ignore
          await blinko.upsertNote.call({ type: noteType, references, refresh: false, content: blinko.noteContent, attachments: files.map(i => { return { name: i.name, path: i.uploadPath, size: i.size, type: i.type } }) })
          blinko.createAttachmentsStorage.clear()
          blinko.createContentStorage.clear()
          if (blinko.noteTypeDefault == NoteType.NOTE && router.query?.path != 'notes') {
            await router.push('/?path=notes')
            blinko.forceQuery++
          }
          if (blinko.noteTypeDefault == NoteType.BLINKO && router.pathname != '/') {
            await router.push('/')
            blinko.forceQuery++
          }
          blinko.updateTicker++
        } else {
          await blinko.upsertNote.call({
            id: blinko.curSelectedNote!.id,
            type: noteType,
            //@ts-ignore
            content: blinko.curSelectedNote.content,
            //@ts-ignore
            attachments: files.map(i => { return { name: i.name, path: i.uploadPath, size: i.size, type: i.type } }),
            references
          })
          try {
            const index = blinko.editAttachmentsStorage.list.findIndex(i => i.id == blinko.curSelectedNote!.id)
            if (index != -1) {
              blinko.editAttachmentsStorage.remove(index)
              blinko.editContentStorage.remove(index)
            }
          } catch (error) {
            console.error(error)
          }
        }
        onSended?.()
      }} />
  </div>
})


