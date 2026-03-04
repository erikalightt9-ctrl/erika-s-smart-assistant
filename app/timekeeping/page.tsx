"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock, LogIn, LogOut, FileText, Calendar, Loader2,
  MapPin, AlertTriangle, CheckCircle2, Navigation,
} from "lucide-react";
import { formatTime, formatDate } from "@/lib/utils";
import Link from "next/link";

interface LocationInfo {
  latitude: number;
  longitude: number;
  locationAddress: string;
}

interface AttendanceStatus {
  timeIn?: {
    timestamp: string;
    latitude?: number;
    longitude?: number;
    locationAddress?: string;
  };
  timeOut?: {
    timestamp: string;
    latitude?: number;
    longitude?: number;
    locationAddress?: string;
  };
}

type GeoState = "idle" | "acquiring" | "acquired" | "denied" | "unavailable";

// Reverse geocode using OpenStreetMap Nominatim (free, no API key)
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    // Build a short address: road + city/town + province
    const a = data.address ?? {};
    const parts = [
      a.road ?? a.pedestrian ?? a.neighbourhood,
      a.city ?? a.town ?? a.village ?? a.municipality,
      a.state ?? a.province,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : data.display_name ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

export default function TimekeepingPage() {
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [now, setNow] = useState(new Date());

  // Geolocation state
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [location, setLocation] = useState<LocationInfo | null>(null);

  // Live clock — PH time
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/timekeeping/today");
      if (res.ok) {
        const data = await res.json();
        setStatus(data.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Acquire geolocation
  const acquireLocation = useCallback((): Promise<LocationInfo | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGeoState("unavailable");
        resolve(null);
        return;
      }
      setGeoState("acquiring");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const locationAddress = await reverseGeocode(latitude, longitude);
          const loc = { latitude, longitude, locationAddress };
          setLocation(loc);
          setGeoState("acquired");
          resolve(loc);
        },
        () => {
          setGeoState("denied");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  async function handleClock(type: "in" | "out") {
    setClocking(true);
    try {
      // Always try to get location; proceed even if denied
      const loc = await acquireLocation();

      const body = loc
        ? {
            latitude: loc.latitude,
            longitude: loc.longitude,
            locationAddress: loc.locationAddress,
          }
        : {};

      const res = await fetch(`/api/timekeeping/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchStatus();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to clock " + type);
      }
    } finally {
      setClocking(false);
    }
  }

  const isClockedIn = !!status?.timeIn;
  const isClockedOut = !!status?.timeOut;

  const phTime = now.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const phDate = now.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Timekeeping
        </h1>
        <div className="text-sm text-muted-foreground">{formatDate(now)}</div>
      </div>

      {/* Clock widget + Today's record */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Clock card */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              {/* Live PH clock */}
              <div className="text-5xl font-mono font-bold tracking-tight mb-1">
                {phTime}
              </div>
              <div className="text-muted-foreground text-sm mb-1">{phDate}</div>
              <div className="flex items-center justify-center gap-1 mb-5">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Philippine Standard Time (UTC+8)</span>
              </div>

              {/* Geolocation status indicator */}
              {geoState === "acquiring" && (
                <div className="flex items-center justify-center gap-2 mb-4 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                  <Navigation className="h-3.5 w-3.5 animate-pulse" />
                  Acquiring your location…
                </div>
              )}
              {geoState === "acquired" && location && (
                <div className="flex items-start justify-center gap-2 mb-4 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 text-left">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="leading-snug">{location.locationAddress}</span>
                </div>
              )}
              {geoState === "denied" && (
                <div className="flex items-center justify-center gap-2 mb-4 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Location access denied — logged without location
                </div>
              )}
              {geoState === "unavailable" && (
                <div className="flex items-center justify-center gap-2 mb-4 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Geolocation not available on this device
                </div>
              )}

              {loading ? (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={() => handleClock("in")}
                    disabled={isClockedIn || clocking}
                    className="gap-2"
                    style={
                      !isClockedIn
                        ? { backgroundColor: "var(--navy)", color: "white" }
                        : {}
                    }
                  >
                    {clocking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogIn className="h-4 w-4" />
                    )}
                    Time In
                  </Button>
                  <Button
                    onClick={() => handleClock("out")}
                    disabled={!isClockedIn || isClockedOut || clocking}
                    variant="outline"
                    className="gap-2"
                  >
                    {clocking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    Time Out
                  </Button>
                </div>
              )}

              {/* Location permission note */}
              {geoState === "idle" && !isClockedIn && (
                <p className="text-[10px] text-muted-foreground mt-3">
                  Your location will be recorded when you clock in/out
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's record card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today&apos;s Record</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">

              {/* Time In row */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <LogIn className="h-3.5 w-3.5" />
                    Time In
                  </span>
                  {status?.timeIn ? (
                    <Badge variant="default" className="font-mono">
                      {formatTime(status.timeIn.timestamp)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">—</Badge>
                  )}
                </div>
                {status?.timeIn?.locationAddress && (
                  <div className="flex items-start gap-1.5 pl-5">
                    <MapPin className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-muted-foreground leading-snug">
                      {status.timeIn.locationAddress}
                    </span>
                  </div>
                )}
                {status?.timeIn && !status.timeIn.locationAddress && (
                  <div className="flex items-center gap-1.5 pl-5">
                    <MapPin className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    <span className="text-[11px] text-muted-foreground/50">
                      No location recorded
                    </span>
                  </div>
                )}
              </div>

              {/* Time Out row */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <LogOut className="h-3.5 w-3.5" />
                    Time Out
                  </span>
                  {status?.timeOut ? (
                    <Badge variant="default" className="font-mono">
                      {formatTime(status.timeOut.timestamp)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">—</Badge>
                  )}
                </div>
                {status?.timeOut?.locationAddress && (
                  <div className="flex items-start gap-1.5 pl-5">
                    <MapPin className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-muted-foreground leading-snug">
                      {status.timeOut.locationAddress}
                    </span>
                  </div>
                )}
                {status?.timeOut && !status.timeOut.locationAddress && (
                  <div className="flex items-center gap-1.5 pl-5">
                    <MapPin className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    <span className="text-[11px] text-muted-foreground/50">
                      No location recorded
                    </span>
                  </div>
                )}
              </div>

              {/* Status row */}
              <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "#f1f5f9" }}>
                <span className="text-sm text-muted-foreground">Status</span>
                {isClockedOut ? (
                  <Badge className="bg-green-500">Done</Badge>
                ) : isClockedIn ? (
                  <Badge className="bg-blue-500">Working</Badge>
                ) : (
                  <Badge variant="secondary">Not Started</Badge>
                )}
              </div>

              {/* Coordinates (collapsible detail) */}
              {(status?.timeIn?.latitude || status?.timeOut?.latitude) && (
                <div className="pt-1 border-t space-y-1.5" style={{ borderColor: "#f1f5f9" }}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    GPS Coordinates
                  </p>
                  {status?.timeIn?.latitude && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-green-700 w-12">IN</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {status.timeIn.latitude.toFixed(6)}, {status.timeIn.longitude?.toFixed(6)}
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${status.timeIn.latitude},${status.timeIn.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:underline ml-auto shrink-0"
                      >
                        View Map ↗
                      </a>
                    </div>
                  )}
                  {status?.timeOut?.latitude && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-red-600 w-12">OUT</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {status.timeOut.latitude.toFixed(6)}, {status.timeOut.longitude?.toFixed(6)}
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${status.timeOut.latitude},${status.timeOut.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:underline ml-auto shrink-0"
                      >
                        View Map ↗
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/timekeeping/dtr">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            View DTR
          </Button>
        </Link>
        <Link href="/timekeeping/leave">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Leave Request
          </Button>
        </Link>
        <Link href="/timekeeping/overtime">
          <Button variant="outline" className="gap-2">
            <Clock className="h-4 w-4" />
            Overtime Request
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance Log</TabsTrigger>
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground text-center py-4">
                View your attendance log by going to the{" "}
                <Link href="/timekeeping/dtr" className="underline">
                  DTR page
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="leave">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground text-center py-4">
                Submit a leave request using the{" "}
                <Link href="/timekeeping/leave" className="underline">
                  Leave page
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
