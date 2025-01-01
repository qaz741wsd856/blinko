import React, { useEffect, useRef, useState } from "react";
import { Button, ScrollShadow, Image, Input, Popover, PopoverTrigger, PopoverContent, Card, Badge, Tooltip } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { UserStore } from "@/store/user";
import Link from "next/link";
import { useRouter } from "next/router";
import { observer } from "mobx-react-lite";
import { RootStore } from "@/store";
import { BlinkoStore } from "@/store/blinkoStore";
import { TagListPanel } from "../Common/TagListPanel";
import { useTheme } from "next-themes";
import { _ } from "@/lib/lodash";
import { useTranslation } from "react-i18next";
import { BaseStore } from "@/store/baseStore";
import { BlinkoAi } from "../BlinkoAi";
import { ScrollArea } from "../Common/ScrollArea";
import { BlinkoRightClickMenu } from '@/components/BlinkoRightClickMenu';
import { useMediaQuery } from "usehooks-ts";
import { push as Menu } from 'react-burger-menu';
import { eventBus } from "@/lib/event";
import TagSelectPop from "../Common/PopoverFloat/tagSelectPop";
import AiWritePop from "../Common/PopoverFloat/aiWritePop";
import { createPortal } from "react-dom";
import { Sidebar } from "./Sidebar";
import { MobileNavBar } from "./MobileNavBar";
import FilterPop from "../Common/PopoverFloat/filterPop";
import { AppProvider } from "@/store/module/AppProvider";
import { api } from "@/lib/trpc";
import { showTipsDialog } from "../Common/TipsDialog";
import { DialogStandaloneStore } from "@/store/module/DialogStandalone";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { BarSearchInput } from "./BarSearchInput";

export const SideBarItem = "p-2 flex flex-row items-center cursor-pointer gap-2 hover:bg-hover rounded-xl transition-all"

export const CommonLayout = observer(({
  children,
  header,
}: {
  children?: React.ReactNode;
  header?: React.ReactNode;
}) => {
  const router = useRouter()
  const [isOpen, setisOpen] = useState(false)
  const [isClient, setClient] = useState(false)
  const isPc = useMediaQuery('(min-width: 768px)')
  const { t } = useTranslation()
  const { theme } = useTheme();
  const user = RootStore.Get(UserStore)
  const blinkoStore = RootStore.Get(BlinkoStore)
  const base = RootStore.Get(BaseStore)

  blinkoStore.use()
  user.use()
  base.useInitApp(router)

  useEffect(() => {
    setClient(true)
  }, [])

  useEffect(() => {
    if (isPc) setisOpen(false)
  }, [isPc])

  useEffect(() => {
    eventBus.on('close-sidebar', () => {
      setisOpen(false)
    })
  }, [])

  if (!isClient) return <></>

  if (router.pathname == '/signin' || router.pathname == '/signup' || router.pathname == '/api-doc' ||
    router.pathname.includes('/share') || router.pathname == '/editor' || router.pathname == '/oauth-callback') {
    return <>{children}</>
  }

  return (
    <div className="flex w-full h-mobile-full overflow-x-hidden" id="outer-container">
      {blinkoStore.showAi && createPortal(<BlinkoAi />, document.body)}
      <AiWritePop />
      <Menu
        disableAutoFocus
        onClose={() => setisOpen(false)}
        onOpen={setisOpen}
        isOpen={isOpen}
        pageWrapId={'page-wrap'}
        outerContainerId={'outer-container'}
      >
        <Sidebar onItemClick={() => setisOpen(false)} />
      </Menu>

      {isPc && <Sidebar />}

      <main id="page-wrap"
        style={{ width: isPc ? `calc(100% - ${base.sideBarWidth}px)` : '100%' }}
        className={`flex transition-all duration-300 overflow-y-hidden w-full flex-col gap-y-1 bg-sencondbackground`}>
        {/* nav bar  */}
        <header className="relative flex md:h-16 md:min-h-16 h-14 min-h-14 items-center justify-between gap-2 rounded-medium px-2 md:px:4 pt-2 md:pb-2 overflow-x-hidden">
          <div className="hidden md:block absolute bottom-[20%] right-[5%] z-[0] h-[350px] w-[350px] overflow-hidden blur-3xl ">
            <div className="w-full h-[100%] bg-[#9936e6] opacity-20"
              style={{ "clipPath": "circle(50% at 50% 50%)" }} />
          </div>
          <div className="flex max-w-full items-center gap-2 md:p-2 w-full z-[1]">
            {!isPc && <Button
              isIconOnly
              className="flex"
              size="sm"
              variant="light"
              onPress={() => setisOpen(!isOpen)}
            >
              <Icon
                className="text-default-500"
                height={24}
                icon="solar:hamburger-menu-outline"
                width={24}
              />
            </Button>}
            <div className="flex flex-1 items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-[4px] h-[16px] bg-primary rounded-xl" />
                <div className="flex flex-row items-center gap-1">
                  <div className="font-black select-none">{t(base.currentTitle)}</div>
                  {
                    router.pathname != '/trash'
                      ? <Icon className="cursor-pointer hover:rotate-180 transition-all"
                        onClick={() => blinkoStore.refreshData()}
                        icon="fluent:arrow-sync-12-filled"
                        width="20"
                        height="20"
                      />
                      : <Icon className="cursor-pointer transition-all text-red-500"
                        onClick={() => {
                          showTipsDialog({
                            size: 'sm',
                            title: t('confirm-to-delete'),
                            content: t('this-operation-removes-the-associated-label-and-cannot-be-restored-please-confirm'),
                            onConfirm: async () => {
                              await RootStore.Get(ToastPlugin).promise(
                                api.notes.clearRecycleBin.mutate(),
                                {
                                  loading: t('in-progress'),
                                  success: <b>{t('your-changes-have-been-saved')}</b>,
                                  error: <b>{t('operation-failed')}</b>,
                                })
                              blinkoStore.refreshData()
                              RootStore.Get(DialogStandaloneStore).close()
                            }
                          })
                        }}
                        icon="mingcute:delete-2-line"
                        width="20"
                        height="20"
                      />
                  }
                </div>
                {!base.isOnline && (
                  <Badge
                    color="warning"
                    variant="flat"
                    className="animate-pulse"
                  >
                    <div className="flex text-sm items-center gap-1 text-yellow-500">
                      <span>{t('offline-status')}</span>
                    </div>
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 md:gap-4 w-auto ">
                <BarSearchInput isPc={isPc} />
                <FilterPop />
                {blinkoStore.dailyReviewNoteList.value?.length != 0 &&
                  <Badge size="sm" className="shrink-0" content={blinkoStore.dailyReviewNoteList.value?.length} color="warning">
                    <Link href="/review" passHref legacyBehavior>
                      <Button
                        as="a"
                        className="mt-[2px]"
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={(e) => {
                          e.preventDefault();
                          router.push('/review');
                        }}
                      >
                        <Icon className='cursor-pointer' icon="mingcute:message-1-line" width="24" height="24" />
                      </Button>
                    </Link>
                  </Badge>
                }
              </div>
            </div>
          </div>
          {header}
        </header>
        {/* backdrop  pt-6 -mt-6 to fix the editor tooltip position */}

        <ScrollArea onBottom={() => { }} className="flex h-[calc(100%_-_70px)] overflow-y-scroll overflow-x-hidden">
          <div className="relative flex h-full w-full flex-col rounded-medium layout-container" >
            {children}
          </div>
        </ScrollArea>

        <MobileNavBar onItemClick={() => setisOpen(false)} />
        <BlinkoRightClickMenu />
      </main>
    </div>
  );
})
