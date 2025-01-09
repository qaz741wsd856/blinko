import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { Item } from "./Item";
import { RootStore } from "@/store";
import { BlinkoStore } from "@/store/blinkoStore";
import { PromiseCall, PromiseState } from "@/store/standard/PromiseState";
import { api } from "@/lib/trpc";
import { Badge, Button, Card, Chip, Input, Select, SelectItem, Switch, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, user } from "@nextui-org/react";
import dayjs from "@/lib/dayjs";
import { useEffect } from "react";
import { Icon } from "@iconify/react";
import { DialogStore } from "@/store/module/Dialog";
import { signOut } from "next-auth/react";
import { PasswordInput } from "../Common/PasswordInput";
import { CollapsibleCard } from "../Common/CollapsibleCard";
import { showTipsDialog } from "../Common/TipsDialog";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { DialogStandaloneStore } from "@/store/module/DialogStandalone";

const UpdateUserInfo = observer(({ id, name, password }: { id?: number, name: string, password: string }) => {
  const { t } = useTranslation()
  const blinko = RootStore.Get(BlinkoStore)
  const store = RootStore.Local(() => ({
    username: name,
    password,
    upsertUser: new PromiseState({
      function: async () => {
        const upsertItem: { name: string; password: string; id?: number } = { name: store.username, password: store.password }
        if (id) upsertItem.id = id
        await PromiseCall(api.users.upsertUserByAdmin.mutate(upsertItem))
        RootStore.Get(DialogStore).close()
        blinko.userList.call()
      }
    })
  }))

  return <>
    <Input
      label={t('username')}
      placeholder={t('username')}
      labelPlacement="outside"
      variant="bordered"
      value={store.username}
      onChange={e => { store.username = e.target.value }}
    />
    <PasswordInput placeholder={t('password')} label={t('password')} value={store.password} onChange={e => { store.password = e.target.value }} />
    <div className="flex w-full mt-2">
      <Button isLoading={store.upsertUser.loading.value} className="ml-auto" color='primary' onPress={async e => {
        await store.upsertUser.call()
      }}>{t('save')}</Button>
    </div>
  </>
})

export const UserSetting = observer(() => {
  const { t } = useTranslation()
  const blinko = RootStore.Get(BlinkoStore)
  useEffect(() => {
    blinko.userList.call()
  }, [])

  return (
    <CollapsibleCard
      icon="tabler:user-cog"
      title={t('user-list')}
    >
      <Item
        leftContent={<>{t('user-list')}</>}
        rightContent={
          <Button size="sm" color="primary" startContent={<Icon icon="tabler:plus" width="18" height="18" />}
            onPress={e => {
              RootStore.Get(DialogStore).setData({
                isOpen: true,
                title: t('create-user'),
                content: <UpdateUserInfo name="" password="" />
              })
            }}>{t('create-user')}</Button>
        }
      />

      <Item
        leftContent={blinko.userList.value ? <Table shadow="none" className="mb-2 max-h-[300px] overflow-y-auto">
          <TableHeader>
            <TableColumn>{t('name-db')}</TableColumn>
            <TableColumn>{t('nickname')}</TableColumn>
            <TableColumn>{t('role')}</TableColumn>
            <TableColumn>{t('login-type')}</TableColumn>
            <TableColumn>{t('action')}</TableColumn>
          </TableHeader>
          <TableBody>
            {
              blinko.userList.value!.map(i => {
                return <TableRow>
                  <TableCell>{i.name}</TableCell>
                  <TableCell>{i.nickname}</TableCell>
                  <TableCell>
                    <Chip size="sm" color="warning" variant="bordered">{i.role}</Chip>
                  </TableCell>
                  <TableCell>{i.loginType == 'oauth' ? 'oauth' : t('password')}</TableCell>
                  <TableCell>
                    <div className="flex">
                      <Button isIconOnly variant="flat" size="sm" startContent={<Icon icon="tabler:edit" width="18" height="18" />} onPress={e => {
                        RootStore.Get(DialogStore).setData({
                          isOpen: true,
                          title: t('edit-user'),
                          content: <UpdateUserInfo id={i.id} name={i.name} password={i.password} />
                        })
                      }}>
                      </Button>
                      <Button isIconOnly color="danger" size="sm" className="ml-2"
                        startContent={<Icon icon="tabler:trash" width="18" height="18" />}
                        onPress={e => {
                          showTipsDialog({
                            size: 'sm',
                            title: t('confirm-to-delete'),
                            content: t('after-deletion-all-user-data-will-be-cleared-and-unrecoverable'),
                            onConfirm: async () => {
                              try {
                                await RootStore.Get(ToastPlugin).promise(
                                  api.users.deleteUser.mutate({ id: i.id }),
                                  {
                                    loading: t('in-progress'),
                                    success: <b>{t('your-changes-have-been-saved')}</b>,
                                    error: (e) => {
                                      return <b>{e.message}</b>
                                    },
                                  })
                                blinko.userList.call()
                                RootStore.Get(DialogStandaloneStore).close()
                              } catch (e) {
                                // RootStore.Get(ToastPlugin).error(e.message)
                                RootStore.Get(DialogStandaloneStore).close()
                              }
                            }
                          })
                        }}>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              })
            }
          </TableBody>
        </Table > : null
        }
      />
    </CollapsibleCard >
  );
});