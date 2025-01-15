import { follows } from "@/lib/prismaZodType"
import { api } from "@/lib/trpc"
import { RootStore } from "@/store"
import { DialogStore } from "@/store/module/Dialog"
import { PromiseCall, PromiseState } from "@/store/standard/PromiseState"
import { Icon } from "@iconify/react"

import { Button, Input, Link, user } from "@nextui-org/react"
import { observer } from "mobx-react-lite"
import { useTranslation } from "react-i18next"
import { UserAvatar } from "../BlinkoCard/commentButton"
import { useEffect } from "react"
import { LoadingAndEmpty } from "../Common/LoadingAndEmpty"

export const BlinkoSiteUser = observer(({ item, showFollow = true, onConfirm, tags }: {
  item: {
    id: any,
    siteName?: string,
    siteUrl: string,
    siteAvatar?: string,
  },
  showFollow: boolean,
  onConfirm: () => void,
  tags?: string[]
}) => {
  const { t } = useTranslation()
  return <div className="flex items-center gap-1 mt-2 w-full">
    <UserAvatar
      key={item.id}
      guestName={item.siteName ?? item.siteUrl}
      account={{
        image: item.siteAvatar ?? ''
      }}
      size={35}
    />
    <div className="flex flex-col gap-1">
      <div>{item.siteName}</div>
      <Link href={item.siteUrl} target="_blank" className="text-blue-500 text-xs">{item.siteUrl}</Link>
      <div className="flex items-center gap-1">{
        tags?.map(tag => (
          <div className="blinko-tag !text-xs mt-2">{tag}</div>
        ))
      }</div>
    </div>
    <Button radius="full" size="sm" className="ml-auto"
      color='primary'
      onPress={() => {
        onConfirm()
      }}>
      {!showFollow ? t('unfollow') : t('follow')}
    </Button>
  </div>
})


export const BlinkoFollowDialog = observer(({ onConfirm }: { onConfirm: () => void }) => {
  const { t } = useTranslation()
  const store = RootStore.Local(() => ({
    siteUrl: '',
    siteList: new PromiseState({
      function: async () => {
        const data = await api.public.hubSiteList.query({})
        return data
      }
    })
  }))
  useEffect(() => {
    store.siteList.call()
  }, [])
  return (
    <div>
      <Input
        value={store.siteUrl}
        onChange={(e) => store.siteUrl = e.target.value}
        label={t('site-url')} placeholder={"https://www.blinko.com"} endContent={
          <Button className="w-[100px]" onPress={async () => {
            await PromiseCall(api.follows.follow.mutate({ siteUrl: store.siteUrl, mySiteUrl: window.location.origin }))
            onConfirm()
            RootStore.Get(DialogStore).close()
          }} size="sm" color="primary" radius="full" startContent={<Icon icon="fluent:people-add-32-regular" className="w-4 h-4" />}>
            {t('follow')}
          </Button>
        } />

      <LoadingAndEmpty
        isLoading={store.siteList.loading.value}
        isEmpty={store.siteList.value?.length == 0}
      />

      <div className="flex items-center gap-2 text-ignore text-bold mx-auto mt-4">
        {store.siteList.value?.map(item => (
          <BlinkoSiteUser
            item={{
              id: item.url,
              siteName: item.title,
              siteUrl: item.url,
              siteAvatar: item.image ?? ''
            }}
            tags={item.tags}
            showFollow={true}
            onConfirm={() => {
              PromiseCall(api.follows.follow.mutate({ siteUrl: item.url, mySiteUrl: window.location.origin }))
              onConfirm()
              RootStore.Get(DialogStore).close()
            }}
          />
        ))}
      </div>
    </div>
  )
})

export const BlinkoFollowingDialog = observer(({ data, onConfirm, isFollowing = false }: { data: follows[], onConfirm: () => void, isFollowing: boolean }) => {
  const { t } = useTranslation()
  return (
    <div className="w-full gap-2">
      {data.map(item => (
        <BlinkoSiteUser
          key={item.id}
          item={{
            id: item.id,
            siteName: item.siteName ?? item.siteUrl,
            siteUrl: item.siteUrl,
            siteAvatar: item.siteAvatar ?? ''
          }}
          showFollow={!isFollowing}
          onConfirm={() => {
            if (isFollowing) {
              PromiseCall(api.follows.unfollow.mutate({ siteUrl: item.siteUrl, mySiteUrl: window.location.origin })).then(() => {
                onConfirm()
                RootStore.Get(DialogStore).close()
              })
            } else {
              PromiseCall(api.follows.follow.mutate({ siteUrl: item.siteUrl, mySiteUrl: window.location.origin })).then(() => {
                onConfirm()
                RootStore.Get(DialogStore).close()
              })
            }
          }} />
      ))}
    </div>
  )
})  