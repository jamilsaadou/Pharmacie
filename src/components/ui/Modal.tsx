'use client';
import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils';
interface ModalProps { isOpen:boolean; onClose:()=>void; title:string; children:React.ReactNode; size?:'sm'|'md'|'lg'|'xl'; }
export default function Modal({isOpen,onClose,title,children,size='md'}:ModalProps){
 const ref=useRef<HTMLDialogElement>(null),titleId=useId();
 useEffect(()=>{const dialog=ref.current;if(isOpen&&dialog&&!dialog.open)dialog.showModal();if(!isOpen&&dialog?.open)dialog.close();return()=>{if(dialog?.open)dialog.close();};},[isOpen]);
 if(!isOpen||typeof document==='undefined')return null;
 const sizes={sm:'max-w-md',md:'max-w-xl',lg:'max-w-3xl',xl:'max-w-5xl'};
 return createPortal(<dialog ref={ref} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}} className={cn('ph-modal',sizes[size])}><div className="flex max-h-[90dvh] flex-col"><header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7"><h2 id={titleId} className="text-xl font-semibold leading-snug text-slate-900">{title}</h2><button type="button" aria-label="Fermer la fenêtre" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><X size={22}/></button></header><div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-7">{children}</div></div></dialog>,document.body);
}
