import {
  Thermometer,
  Droplet,
  Gauge,
  Zap,
  Lightbulb,
  ToggleRight,
  Wind,
  Sun,
  CloudRain,
  Speaker,
  Tv,
  Lock,
  Shield,
  DoorOpen,
  CircleHelp,
  Power,
  BatteryCharging,
  BarChartHorizontalBig,
  Percent,
  AirVent,
  Users,
  Cloud,
  CalendarDays,
  Clock,
  MapPin
} from 'lucide-react';
import type { Entity } from '@/types/home-assistant';

export const getEntityIcon = (entity: Entity): JSX.Element => {
  const deviceClass = entity.attributes.device_class;
  const entityIdDomain = entity.entity_id.split('.')[0];

  if (entity.attributes.icon) {
    // Potentially map mdi:icon to lucide if needed, or return a generic icon
    // For now, if custom icon, use a generic one
    // This part could be expanded to handle mdi icons if a mapping library is used
  }

  switch (deviceClass) {
    case 'temperature':
      return <Thermometer className="h-5 w-5" />;
    case 'humidity':
      return <Droplet className="h-5 w-5" />;
    case 'pressure':
      return <Gauge className="h-5 w-5" />; // Or another suitable icon
    case 'power':
      return <Zap className="h-5 w-5" />;
    case 'energy':
      return <BatteryCharging className="h-5 w-5" />;
    case 'voltage':
    case 'current':
      return <Zap className="h-5 w-5" />; // Re-using Zap, or find more specific
    case 'illuminance':
      return <Sun className="h-5 w-5" />;
    case 'gas':
    case 'carbon_monoxide':
    case 'carbon_dioxide':
      return <Wind className="h-5 w-5" />; // Generic for gases
    case 'moisture':
    case 'precipitation':
      return <CloudRain className="h-5 w-5" />;
    case 'battery':
      return <BatteryCharging className="h-5 w-5" />; // Or Battery icon when available
    case 'door':
    case 'window':
    case 'garage_door':
      return <DoorOpen className="h-5 w-5" />;
    case 'lock':
      return <Lock className="h-5 w-5" />;
    case 'safety':
    case 'smoke':
    case 'gas':
      return <Shield className="h-5 w-5" />;
    case 'presence':
      return <Users className="h-5 w-5" />;
    case 'outlet':
    case 'switch':
        return <Power className="h-5 w-5" />;
    case 'aqi': // Air Quality Index
        return <AirVent className="h-5 w-5" />;
    case 'percentage':
        return <Percent className="h-5 w-5" />;
    default:
      // Fallback to domain
      break;
  }
  
  switch (entityIdDomain) {
    case 'sensor':
      return <BarChartHorizontalBig className="h-5 w-5" />; // Generic sensor
    case 'light':
      return <Lightbulb className="h-5 w-5" />;
    case 'switch':
      return <ToggleRight className="h-5 w-5" />;
    case 'binary_sensor': // Often has device_class, but if not
      return <Shield className="h-5 w-5" />; // Or other suitable
    case 'media_player':
      return <Speaker className="h-5 w-5" />; // Or Tv
    case 'climate':
      return <AirVent className="h-5 w-5" />;
    case 'cover':
      return <DoorOpen className="h-5 w-5" />; // Or more specific cover icon
    case 'weather':
      return <Cloud className="h-5 w-5" />;
    case 'person':
    case 'device_tracker':
      return <MapPin className="h-5 w-5" />;
    case 'calendar':
        return <CalendarDays className="h-5 w-5" />;
    case 'input_boolean':
    case 'input_select':
    case 'input_text':
    case 'input_number':
    case 'input_datetime':
        return <ToggleRight className="h-5 w-5" />; // Generic input icon
    case 'automation':
        return <Power className="h-5 w-5" />; // Or a cog icon if desired
    case 'script':
        return <Power className="h-5 w-5" />; // Or a play icon
    case 'zone':
        return <MapPin className="h-5 w-5" />;
    case 'sun':
        return <Sun className="h-5 w-5" />;
    case 'clock':
        return <Clock className="h-5 w-5" />;
    default:
      return <CircleHelp className="h-5 w-5" />;
  }
};
