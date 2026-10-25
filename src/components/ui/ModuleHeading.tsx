import type { LucideIcon } from 'lucide-react';
export function ModuleHeading({icon:Icon,title,description}:{icon:LucideIcon;title:string;description:string}){return <header className="ph-module-heading"><span><Icon size={27} strokeWidth={1.7}/></span><div><h1>{title}</h1><p>{description}</p></div></header>;}
