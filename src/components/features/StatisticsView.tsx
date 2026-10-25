'use client';
import { useRayonData } from '@/hooks/useRayonData';
import StatistiquesRayons from './StatistiquesRayons';
export default function StatisticsView() { const data = useRayonData(); return <StatistiquesRayons rayons={data.rayons} medicamentsRayons={data.medicamentsRayons} transferts={data.transferts} medicaments={data.medicaments} />; }
