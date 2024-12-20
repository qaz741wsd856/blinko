import React, { useEffect } from "react";
import { Button, Modal, ModalBody, ModalContent, ModalHeader } from "@nextui-org/react";
import { observer, useLocalStore } from "mobx-react-lite";
import { DialogStore } from ".";
import { RootStore } from "@/store/root";
import { useHistoryBack, useIsIOS } from "@/lib/hooks";
import { useMediaQuery } from "usehooks-ts";
import { motion } from "motion/react";
import { Icon } from "@iconify/react";
import { CancelIcon } from "@/components/Common/Icons";

const CloseButton = ({ onClose }: { onClose: () => void }) => (
  <div
    onClick={onClose}
    className={`cursor-pointer hover:scale-110 transition-all absolute 
    md:top-[-12px] md:right-[-12px] top-[-25px] right-[calc(50%-17.5px)] bg-[#FFCC00] border-2 border-[#d9ae02] z-[2002] text-black p-2 rounded-full 
    !w-[35px] !h-[35px] flex items-center justify-center`}
  >
    <CancelIcon className='primary-foreground group-hover:rotate-[180deg] transition-all' />
  </div>
);

const Dialog = observer(() => {
  const modal = RootStore.Get(DialogStore);
  const isPc = useMediaQuery('(min-width: 768px)')
  const { className, classNames, isOpen, placement, title, size, content, isDismissable, onlyContent = false, noPadding = false, showOnlyContentCloseButton = false, transparent = false } = modal;
  const Content = typeof content === 'function' ? content : () => content;
  const isIOS = useIsIOS()
  useHistoryBack({
    state: isOpen,
    onStateChange: () => modal.close(),
    historyState: 'modal'
  });

  const motionConfig = {
    initial: "enter",
    animate: "enter",
    exit: "exit",
    variants: {
      enter: {
        y: 0,
        opacity: 1,
        transition: { type: 'spring', bounce: 0.5, duration: 0.6 },
      },
      exit: {
        y: -20,
        opacity: 0,
        transition: { type: 'spring', bounce: 0.5, duration: 0.3 },
      },
    }
  };

  const containerClass = isPc
    ? "fixed inset-0 z-[2001] flex justify-center items-center pointer-events-none max-w-screen-2xl mx-auto left-0 right-0"
    : "fixed bottom-0 left-0 right-0 z-[2001] flex flex-col items-center pointer-events-none";

  const modalSizeClass = (() => {
    const baseClass = 'mx-auto ';
    switch (size) {
      case 'xs':
        return baseClass + 'w-1/4';
      case 'sm':
        return baseClass + 'w-1/3';
      case 'md':
        return baseClass + 'w-1/2';
      case 'lg':
        return baseClass + 'w-2/3';
      case 'xl':
        return baseClass + 'w-3/4';
      case '2xl':
        return baseClass + 'w-4/5';
      case '3xl':
        return baseClass + 'w-5/6';
      case '4xl':
        return baseClass + 'w-11/12';
      case '5xl':
        return baseClass + 'w-full';
      case 'full':
        return baseClass + 'w-full';
      default:
        return baseClass + 'w-full';
    }
  })();

  if (isIOS && isOpen) {
    return (
      <>
        <div
          className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm"
          onClick={() => {
            if (isDismissable) {
              modal.close()
            }
          }}
        />
        <motion.div
          className={`${containerClass} ${isPc ? modalSizeClass : ''} `}
          {...motionConfig}
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
        >
          {!onlyContent && (
            <motion.div
              className="w-full bg-background border-sencondbackground p-1 rounded-t-lg shadow-lg pointer-events-auto"
              {...motionConfig}
            >
              <div className="flex flex-col justify-between items-center p-2 gap-2 w-full">
                <div className="flex gap-2 w-full items-center">
                  <div className="text-lg font-semibold">{title ?? ''}</div>
                  <Button isIconOnly variant="light" onPress={() => modal.close()} className="ml-auto">
                    <Icon icon="tabler:x" width="16" height="16" />
                  </Button>
                </div>
                <div className="w-full" >
                  <Content />
                </div>
              </div>
            </motion.div>
          )}
          {
            onlyContent && <motion.div
              className="w-full pointer-events-auto "
              {...motionConfig}
            >
              <div className="relative w-full">
                {
                  showOnlyContentCloseButton &&
                  <CloseButton onClose={() => modal.close()} />
                }
                <div className="w-full">
                  <Content />
                </div>
              </div>
            </motion.div>
          }
        </motion.div>
      </>
    )
  }
  return (
    <>
      <Modal
        style={{ zIndex: 2000 }}
        onClose={() => {
          modal.close();
        }}
        backdrop='blur'
        isOpen={isOpen}
        size={size}
        placement={placement}
        onOpenChange={(open: boolean) => {
          if (open) {
            modal.preventClose = false
          }
          if (!open) {
            if (!modal.preventClose) {
              modal.close();
            }
          }
        }}
        hideCloseButton={(size === 'full' || onlyContent) ? true : false}
        className={`${className} ${transparent ? 'bg-transparent' : ''}`}
        classNames={classNames}
        isDismissable={isDismissable}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: { type: 'spring', bounce: 0.5, duration: 0.6, },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: { type: 'spring', bounce: 0.5, duration: 0.3, },
            },
          }
        }}
      >
        {
          onlyContent ?
            <ModalContent className="max-h-screen overflow-visible relative modal-content" >

              {
                showOnlyContentCloseButton &&
                <CloseButton onClose={() => modal.close()} />
              }
              <Content />
            </ModalContent> :
            <ModalContent className="max-h-screen overflow-auto">
              {() => (
                <>
                  {title && <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>}
                  <ModalBody className={`${noPadding ? '' : 'p-2 md:p-4 '}`}>
                    <Content />
                  </ModalBody>
                </>
              )}
            </ModalContent>
        }
      </Modal>
    </>
  );
});

export default Dialog;