import { Icon } from '@iconify/react';
import { Popover, PopoverContent, PopoverTrigger } from '@heroui/react';
import { observer } from 'mobx-react-lite';
import { BlinkoStore } from '@/store/blinkoStore';
import { RootStore } from '@/store';
import { ScrollArea } from '../ScrollArea';
import { IconButton } from '../Editor/Toolbar/IconButton';
import { useState } from 'react';
import { getDisplayTime } from '@/lib/helper';

interface Props {
  iconButton?: React.ReactNode;
  onSelect: (item: any) => void;
  blackList?: number[];
  tooltip?: string;
  autoClose?: boolean;
}

export const BlinkoSelectNote = observer(({ iconButton, onSelect, blackList = [], tooltip = 'reference', autoClose = true }: Props) => {
  const blinko = RootStore.Get(BlinkoStore);
  const [isOpen, setIsOpen] = useState(false);

  const defaultIconButton = (
    <IconButton
      tooltip={tooltip}
      icon="ph:link"
    />
  );

  return (
    <Popover 
      placement="bottom"
      isOpen={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          blinko.referenceSearchList.resetAndCall({ searchText: ' ' });
        }
      }}
    >
      <PopoverTrigger>
        <div>
          {iconButton || defaultIconButton}
        </div>
      </PopoverTrigger>
      <PopoverContent className='flex flex-col max-w-[300px]'>
        <ScrollArea
          className='max-h-[400px] max-w-[290px] flex flex-col gap-2'
          onBottom={() => { blinko.referenceSearchList.callNextPage({}) }}
        >
          {blinko.referenceSearchList?.value?.map(item => (
            <div
              key={item.id}
              className={`flex flex-col w-full bg-background hover:bg-hover rounded-md cursor-pointer p-1
                ${blackList.includes(item.id) ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => {
                if (!blackList.includes(item.id)) {
                  if (autoClose) {
                    setIsOpen(false);
                  }
                  onSelect(item);
                }
              }}
            >
              <div className="flex flex-col w-full p-1">
                <div className="text-xs text-desc">
                  {getDisplayTime(item.createdAt, item.updatedAt)}
                </div>
                <div className="text-sm line-clamp-2">
                  {item.content}
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}); 