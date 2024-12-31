import { Card, Image, Checkbox, Chip, Tooltip } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import { filesize } from "filesize";
import dayjs from "@/lib/dayjs";
import { FileIcons } from "@/components/Common/AttachmentRender/FileIcon";
import { memo, useState, useEffect, useCallback, useMemo } from "react";
import { Draggable, Droppable } from 'react-beautiful-dnd-next';
import { useTranslation } from "react-i18next";
import { type ResourceType } from "@/server/types";
import { ResourceContextMenu } from './ResourceContextMenu';
import { ContextMenuTrigger } from '@/components/Common/ContextMenu';
import { RootStore } from "@/store";
import { ResourceStore } from "@/store/resourceStore";
import { _ } from "@/lib/lodash";
import { observer } from "mobx-react-lite";
import { toJS } from "mobx";
import { motion } from "framer-motion";
import { ImageThumbnailRender } from "../Common/AttachmentRender/imageRender";

interface ResourceItemProps {
  item: ResourceType;
  index: number;
  onSelect: (id: number) => void;
  isSelected: boolean;
  onFolderClick: (folderName: string) => void;
}

interface ResourceCardProps {
  item: ResourceType;
  isSelected: boolean;
  onSelect: (id: number) => void;
  isDragging?: boolean;
  isDraggingOver?: boolean;
  // children?: React.ReactNode;
}

const getCardClassName = (isDragging?: boolean, isDraggingOver?: boolean) => {
  const baseClasses = "mb-2 p-4 hover:bg-hover bg-background transition-all duration-200";

  if (isDraggingOver) {
    return `${baseClasses} relative overflow-visible ring-2 ring-primary/30 bg-primary/10`;
  }

  if (isDragging) {
    return `${baseClasses} opacity-50 bg-primary/10`;
  }

  return baseClasses;
};

const ResourceCard = observer(({
  item,
  isSelected,
  onSelect,
  isDragging,
  isDraggingOver,
}: ResourceCardProps) => {
  const { t } = useTranslation();
  const resourceStore = RootStore.Get(ResourceStore);
  const isImage = item.type?.startsWith('image/');

  const fileNameAndExt = useMemo(() => {
    const fileName = toJS(item.name);
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return { name: fileName, ext: '' };
    return {
      name: fileName.substring(0, lastDotIndex),
      ext: fileName.substring(lastDotIndex + 1)
    };
  }, [item.name]);

  const isS3File = useMemo(() => item.path?.includes('s3file'), [item.path]);

  const handleContextMenu = useCallback(() => {
    console.log('handlContetxmet')
    resourceStore.setContextMenuResource(_.cloneDeep(item));
  }, [item, resourceStore]);

  const cardProps = {
    className: getCardClassName(isDragging, isDraggingOver)
  };

  if (item.isFolder) {
    return (
      <Card {...cardProps} shadow="none">
        <div className="flex items-center gap-4 ml-[45px]">
          <div className="w-[36px] h-[36px] ml-[-7px] flex items-center justify-center">
            <Icon icon="material-symbols:folder" className="w-full h-full text-yellow-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{item.folderName}</div>
          </div>
          <ResourceContextMenu onTrigger={handleContextMenu} />
        </div>
      </Card>
    );
  }

  return (
    <Card {...cardProps} shadow="none">
      <div className="flex items-center gap-4">
        <Checkbox
          isSelected={isSelected}
          onChange={() => onSelect(item.id!)}
          className="z-10"
        />
        {isImage ? (
            <PhotoView src={item.path}>
              <div>
                <ImageThumbnailRender
                  src={item.path}
                  className="!w-[28px] !h-[28px] object-cover rounded"
                />
              </div>
            </PhotoView>
        ) : (
          <div className="w-[28px] h-[28px] flex items-center justify-center">
            <FileIcons path={item.path} size={28} />
          </div>
        )}
        <div className="flex-1">
          <div className="font-medium text-sm flex items-center gap-2 ">
            <span className='max-w-[100px] truncate md:max-w-[250px]'>{fileNameAndExt.name}</span>
            {isS3File && (
              <Tooltip content={t('cloud-file')}>
                <Icon
                  icon="fluent-color:cloud-16"
                  className="w-4 h-4 "
                />
              </Tooltip>
            )}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2 my-1">
            <span className="rounded-md px-1.5 py-0.5 bg-default-100 text-default-600">
              {fileNameAndExt.ext}
            </span>
            {filesize(Number(item.size))} · {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
          </div>
        </div>
        <ResourceContextMenu onTrigger={handleContextMenu} />
      </div>
    </Card>
  );
});

const ResourceItem = observer(({ item, index, onSelect, isSelected, onFolderClick }: ResourceItemProps) => {
  const { t } = useTranslation();

  const handleClick = useMemo(() => (e: React.MouseEvent) => {
    if (item.isFolder) {
      e.preventDefault();
      onFolderClick(item.folderName || '');
    }
  }, [item.isFolder, item.folderName, onFolderClick]);

  const draggableId = useMemo(() =>
    item.isFolder ? `folder-${item.folderName}` : String(item.id),
    [item.isFolder, item.folderName, item.id]
  );

  const droppableId = useMemo(() =>
    item.isFolder ? `folder-${item.folderName}` : undefined,
    [item.isFolder, item.folderName]
  );

  return (
    <Draggable
      draggableId={draggableId}
      index={index}
      isDragDisabled={item.isFolder}
    >
      {(provided: any, snapshot: any) => {
        const draggableStyle = {
          cursor: item.isFolder ? 'pointer' : 'default',
          ...provided.draggableProps.style,
          transform: item.isFolder ? 'none' : provided.draggableProps.style?.transform
        };

        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`relative group`}
            onClick={handleClick}
            style={draggableStyle}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: index * 0.05,
                ease: "easeOut"
              }}
            >
              {item.isFolder ? (
                <Droppable droppableId={droppableId!}>
                  {(dropProvided, dropSnapshot) => (
                    <div
                      ref={dropProvided.innerRef}
                      {...dropProvided.droppableProps}
                      className="w-full h-full relative"
                    >
                      <ResourceCard
                        item={item}
                        isSelected={isSelected}
                        onSelect={onSelect}
                        isDraggingOver={dropSnapshot.isDraggingOver}
                      />
                      {dropProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              ) : (
                <ResourceCard
                  item={item}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  isDragging={snapshot.isDragging}
                />
              )}
            </motion.div>
          </div>
        );
      }}
    </Draggable>
  );
});

export const MemoizedResourceItem = memo(ResourceItem, (prevProps, nextProps) => {
  const prevItem = toJS(prevProps.item);
  const nextItem = toJS(nextProps.item);

  if (prevItem.isFolder && nextItem.isFolder) {
    return (
      prevItem.folderName === nextItem.folderName &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.index === nextProps.index
    );
  }

  return (
    prevItem.id === nextItem.id &&
    prevItem.name === nextItem.name &&
    prevItem.path === nextItem.path &&
    prevItem.size === nextItem.size &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.index === nextProps.index
  );
}); 