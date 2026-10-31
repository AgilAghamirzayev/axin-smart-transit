import type { CrowdLevel,Stop } from '@/features/transit/types';
export interface JourneyPoint {latitude:number;longitude:number;name:string;id?:string;nearestStopId?:string;nearestStopName?:string;distanceMeters?:number;accuracyMeters?:number}
export interface JourneyLeg {routeId:string;routeNumber:string;vehicleId:string;pathIndex:number;from:Stop;to:Stop;boardAt:string;alightAt:string;waitSeconds:number;rideSeconds:number;crowdLevel:CrowdLevel;boardProgress:number;alightProgress:number}
export interface JourneyOption {legs:JourneyLeg[];walkingSeconds:number;totalSeconds:number;crowdPenaltySeconds:number;arriveAt:string;uncertaintySeconds:number;explanation:string}
export interface JourneyPlan {generatedAt:string;options:JourneyOption[];method:string;limitation:string}
