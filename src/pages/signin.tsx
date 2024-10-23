import React, { useEffect, useState } from "react";
import { Button, Input, Checkbox, Link, Image } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { signIn } from "next-auth/react";
import { RootStore } from "@/store";
import { useRouter } from "next/router";
import { ToastPlugin } from "@/store/module/Toast/Toast";
import { UserController } from "@/server/share/controllers/userController";
import { useTranslation } from "react-i18next";

export default function Component() {
  const router = useRouter()
  const [isVisible, setIsVisible] = React.useState(false);
  const [user, setUser] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [userCount, setUserCount] = useState(0)
  const { t } = useTranslation()
  useEffect(() => {
    try {
      UserController.findUserCount().then(v => setUserCount(v ?? 0))
    } catch (error) {
    }
  }, [])
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500 p-2 sm:p-4 lg:p-8">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-large bg-content1 px-8 pb-10 pt-6 shadow-large">
        <p className="pb-2 text-xl font-medium flex gap-2 items-center justiy-center">
          Login With <Image src='/logo.svg' width={100}></Image></p>
        <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
          <Input
            label={t('username')}
            name={t('username')}
            placeholder={t('enter-your-name')}
            type="text"
            variant="bordered"
            value={user}
            onChange={e => setUser(e.target.value)}
          />
          <Input
            endContent={
              <button type="button" onClick={() => setIsVisible(!isVisible)}>
                {isVisible ? (
                  <Icon
                    className="pointer-events-none text-2xl text-default-400"
                    icon="solar:eye-closed-linear"
                  />
                ) : (
                  <Icon
                    className="pointer-events-none text-2xl text-default-400"
                    icon="solar:eye-bold"
                  />
                )}
              </button>
            }
            label={t('password')}
            name="password"
            placeholder={t('enter-your-password')}
            type={isVisible ? "text" : "password"}
            variant="bordered"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <div className="flex items-center justify-between px-1 pl-2 pr-2">
            <Checkbox defaultChecked name="remember" size="sm">
              {t('keep-sign-in')}
            </Checkbox>
            {/* <Link className="text-default-500" href="#" size="sm">
              忘记密码?
            </Link> */}
          </div>
          <Button color="primary" onClick={async e => {
            try {
              const res = await signIn('credentials', {
                username: user,
                password,
                callbackUrl: '/',
                redirect: false,
              })
              console.log(res)
              if (res?.ok) {
                router.push('/')
              } else {
                RootStore.Get(ToastPlugin).error(t('user-or-password-error'))
              }
            } catch (error) {
              console.log(error)
            }
          }}>
            {t('sign-in')}
          </Button>
        </form>
        {
          userCount == 0 && <p className="text-center text-small">
            {t('need-to-create-an-account')}&nbsp;
            <Link href="/signup" size="sm" >
              {t('sign-up')}
            </Link>
          </p>
        }
      </div>
    </div>
  );
}
