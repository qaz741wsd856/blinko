
import _ from 'lodash';
import { observer } from 'mobx-react-lite';
import { RootStore } from '@/store';
import { motion } from "framer-motion"
import { Icon } from '@iconify/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BlinkoController } from '@/server/share/controllers/blinkoController';
import { ToastPlugin } from '@/store/module/Toast/Toast';
import { ShowUpdateTagDialog } from '../Common/UpdateTagPop';
import { showTipsDialog } from '../Common/TipsDialog';
import { DeleteController } from '@/server/share/controllers/deleteController';
import { DialogStore } from '@/store/module/Dialog';
import { BlinkoStore } from '@/store/blinkoStore';
import { api } from '@/lib/trpc';


const SelectBox = `select-none multi-select-toolbar flex fixed w-fit h-[50px] 
p-4 rounded-xl font-bold items-center justify-center 
left-[calc(50%_-_190px)] md:left-[40%] top-10 md:bottom-10 md:top-auto
bg-primary text-primary-foreground z-[-99] gap-4  shadow-lg`

const SelectItems = "flex items-center justify-center gap-1 cursor-pointer hover:opacity-80 transition-all"

export const BlinkoMultiSelectPop = observer(() => {
  const { t } = useTranslation()
  const blinko = RootStore.Get(BlinkoStore)
  return <motion.div
    animate={blinko.isMultiSelectMode ? 'show' : 'hidden'}
    variants={{
      show: {
        y: 5,
        opacity: 1,
        type: 'spring',
        zIndex: 11
      },
      hidden: {
        y: 0,
        opacity: 0,
        type: 'spring',
        transitionEnd: {
          zIndex: -99
        }
      },
    }}
    className={SelectBox}>
    <div className='flex items-center justify-center gap-2'>
      <Icon onClick={e => {
        blinko.curMultiSelectIds = blinko.noteList.value?.map(i => i.id) || []
      }}
        className='cursor-pointer hover:opacity-80 transition-all' icon="fluent:select-all-on-16-filled" width="20" height="20" />
      {blinko.noteList.value?.length}/{blinko.curMultiSelectIds.length} {t('items')}</div>
    <div className='w-[2px] rounded-sm h-full bg-primary-foreground'></div>

    <div className={SelectItems}
      onClick={async () => {
        await RootStore.Get(ToastPlugin).promise(
          BlinkoController.updateManyBlinko({ ids: blinko.curMultiSelectIds, isArchived: true }),
          {
            loading: t('in-progress'),
            success: <b>{t('your-changes-have-been-saved')}</b>,
            error: <b>{t('operation-failed')}</b>,
          })
        blinko.onMultiSelectRest()
      }}>
      <Icon icon="eva:archive-outline" width="20" height="20" />
      <div>{t('archive')}</div>
    </div>

    <div className={SelectItems + ' relative'}
      onClick={() => {
        ShowUpdateTagDialog({
          type: 'select',
          onSave: async (tagName) => {
            await RootStore.Get(ToastPlugin).promise(
              BlinkoController.batchUpdateTagByNoteIds({ tag: tagName, ids: blinko.curMultiSelectIds }),
              {
                loading: t('in-progress'),
                success: <b>{t('your-changes-have-been-saved')}</b>,
                error: <b>{t('operation-failed')}</b>,
              })
            blinko.onMultiSelectRest()
          }
        })
      }}>
      <Icon icon="solar:tag-outline" width="20" height="20" />
      <div>{t('add-tag')}</div>
    </div>

    <div
      onClick={async (e) => {
        showTipsDialog({
          title: t('confirm-to-delete'),
          content: t('this-operation-removes-the-associated-label-and-cannot-be-restored-please-confirm'),
          onConfirm: async () => {
            await RootStore.Get(ToastPlugin).promise(
              DeleteController.deleteNotes({ ids: blinko.curMultiSelectIds }),
              {
                loading: t('in-progress'),
                success: <b>{t('your-changes-have-been-saved')}</b>,
                error: <b>{t('operation-failed')}</b>,
              })
            blinko.curMultiSelectIds.map(i => api.ai.embeddingDelete.mutate({ id: i }))
            blinko.onMultiSelectRest()
            RootStore.Get(DialogStore).close()
          }
        })

      }} className={SelectItems + ' text-red-500'}>
      <Icon icon="mingcute:delete-2-line" width="20" height="20" />
      <div>{t('delete')}</div>
    </div>
    <div className='cursor-pointer hover:opacity-80 transition-all'
      onClick={() => {
        blinko.onMultiSelectRest()
      }}>
      <Icon icon="material-symbols:cancel-outline" width="20" height="20" />
    </div>

  </motion.div >
})