import {
  AirVent,
  Fan,
  Lightbulb,
  Microwave,
  Monitor,
  Plug,
  Refrigerator,
  ShowerHead,
  Snowflake,
  Tv,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react';

export const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  plug: { icon: Plug, label: 'Tomada' },
  snowflake: { icon: Snowflake, label: 'Ar-condicionado' },
  airvent: { icon: AirVent, label: 'Climatizador' },
  fridge: { icon: Refrigerator, label: 'Geladeira' },
  tv: { icon: Tv, label: 'TV' },
  lamp: { icon: Lightbulb, label: 'Lâmpada' },
  shower: { icon: ShowerHead, label: 'Chuveiro' },
  fan: { icon: Fan, label: 'Ventilador' },
  washer: { icon: WashingMachine, label: 'Máquina de lavar' },
  computer: { icon: Monitor, label: 'Computador' },
  microwave: { icon: Microwave, label: 'Micro-ondas' },
};

export function DeviceIcon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const Icon = ICONS[name]?.icon ?? Plug;
  return <Icon className={className} aria-hidden />;
}
