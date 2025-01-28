import { observer } from "mobx-react-lite";
import { BlinkoStore } from '@/store/blinkoStore';
import { Card } from '@nextui-org/react';
import { RootStore } from '@/store';
import { ContextMenuTrigger } from '@/components/Common/ContextMenu';
import { Note } from '@/server/types';
import { ShowEditBlinkoModel } from "../BlinkoRightClickMenu";
import { useMediaQuery } from "usehooks-ts";
import { _ } from '@/lib/lodash';
import { useState, useEffect } from "react";
import { ExpandableContainer } from "./expandContainer";
import { CardBlogBox } from "./cardBlogBox";
import { NoteContent } from "./noteContent";
import { helper } from "@/lib/helper";
import { CardHeader } from "./cardHeader";
import { CardFooter } from "./cardFooter";
import { useHistoryBack } from "@/lib/hooks";
import { useRouter } from "next/router";
import { FocusEditorFixMobile } from "../Common/Editor/editorUtils";
import { AvatarAccount } from "./commentButton";

export type BlinkoItem = Note & {
  isBlog?: boolean;
  blogCover?: string;
  title?: string;
  originURL?: string;
}

interface BlinkoCardProps {
  blinkoItem: BlinkoItem;
  className?: string;
  account?: AvatarAccount;
  isShareMode?: boolean;
  forceBlog?: boolean;
  defaultExpanded?: boolean;
  glassEffect?: boolean;
  withoutHoverAnimation?: boolean;
}

export const BlinkoCard = observer(({ blinkoItem, account, isShareMode = false, glassEffect = false, forceBlog = false, withoutHoverAnimation = false, className }: BlinkoCardProps) => {
  const isPc = useMediaQuery('(min-width: 768px)');
  const blinko = RootStore.Get(BlinkoStore);
  const [isExpanded, setIsExpanded] = useState(false);
  const { pathname } = useRouter();

  useHistoryBack({
    state: isExpanded,
    onStateChange: () => setIsExpanded(false),
    historyState: 'expanded'
  });
  if (forceBlog) {
    blinkoItem.isBlog = true
  } else {
    blinkoItem.isBlog = ((blinkoItem.content?.length ?? 0) > (blinko.config.value?.textFoldLength ?? 1000)) && !pathname.includes('/share/')
  }
  blinkoItem.title = blinkoItem.content?.split('\n').find(line => {
    if (!line.trim()) return false;
    if (helper.regex.isContainHashTag.test(line)) return false;
    return true;
  }) || '';
  blinkoItem.blogCover = blinkoItem.attachments?.find(i =>
    i.type.includes('image') || helper.getFileType(i.type, i.path) == 'image'
  )?.path ?? '';

  const handleExpand = () => {
    if (blinkoItem.isBlog) {
      setIsExpanded(true);
    }
  };

  const handleClick = () => {
    if (blinko.isMultiSelectMode) {
      blinko.onMultiSelectNote(blinkoItem.id!);
    } else {
      handleExpand();
    }
  };

  const handleContextMenu = () => {
    if (isShareMode) return;
    blinko.curSelectedNote = _.cloneDeep(blinkoItem);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isShareMode) return;
    blinko.curSelectedNote = _.cloneDeep(blinkoItem);
    ShowEditBlinkoModel();
    FocusEditorFixMobile()
  };

  return (
    <ExpandableContainer isExpanded={isExpanded} key={blinkoItem.id} onClose={() => setIsExpanded(false)}>
      {(() => {
        const cardContent = (
          <div
            {...(!isShareMode && {
              onContextMenu: handleContextMenu,
              onDoubleClick: handleDoubleClick
            })}
            onClick={handleClick}
          >
            <Card
              onContextMenu={e => !isPc && e.stopPropagation()}
              shadow='none'
              className={`
                flex flex-col p-4 ${glassEffect ? 'bg-transparent' : 'bg-background'} transition-all group/card 
                ${isExpanded ? 'h-screen overflow-y-scroll rounded-none' : ''} 
                ${isPc && !isExpanded && !blinkoItem.isShare && !withoutHoverAnimation ? 'hover:translate-y-1' : ''} 
                ${blinkoItem.isBlog ? 'cursor-pointer' : ''} 
                ${blinko.curMultiSelectIds?.includes(blinkoItem.id!) ? 'border-2 border-primary' : ''}
                ${className}
              `}
            >
              <div className={isExpanded ? 'max-w-[800px] mx-auto relative md:p-4 w-full' : 'w-full'}>
                <CardHeader blinkoItem={blinkoItem} blinko={blinko} isShareMode={isShareMode} isExpanded={isExpanded} account={account} />

                {blinkoItem.isBlog && !isExpanded && (
                  <CardBlogBox blinkoItem={blinkoItem} />
                )}

                {(!blinkoItem.isBlog || isExpanded) && <NoteContent blinkoItem={blinkoItem} blinko={blinko} isExpanded={isExpanded} />}

                <CardFooter blinkoItem={blinkoItem} blinko={blinko} isShareMode={isShareMode} />

                {isExpanded && (
                  <>
                    <div className="halation absolute bottom-10 left-0 md:left-[50%] h-[400px] w-[400px] overflow-hidden blur-3xl z-[0] pointer-events-none">
                      <div
                        className="w-full h-[100%] bg-[#c45cff] opacity-5"
                        style={{ clipPath: "circle(50% at 50% 50%)" }}
                      />
                    </div>
                    <div className="halation absolute top-10 md:right-[50%] h-[400px] w-[400px] overflow-hidden blur-3xl z-[0] pointer-events-none">
                      <div
                        className="w-full h-[100%] bg-[#c45cff] opacity-5"
                        style={{ clipPath: "circle(50% at 50% 50%)" }}
                      />
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        );

        return isShareMode ? cardContent : (
          <ContextMenuTrigger id="blink-item-context-menu">
            {cardContent}
          </ContextMenuTrigger>
        );
      })()}
    </ExpandableContainer>
  );
});