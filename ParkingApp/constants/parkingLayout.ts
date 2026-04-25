export type ParkingSpotStatus = "available" | "booked";

export type ParkingSpot = {
  spotId: string;
  label: string;
  row: number;
  column: number;
  type?: string;
  status?: ParkingSpotStatus;
};

const DEFAULT_COLUMNS = 4;

const getSpotLabel = (index: number, columns = DEFAULT_COLUMNS) => {
  const rowIndex = Math.floor(index / columns);
  const columnIndex = (index % columns) + 1;
  const rowLetter = String.fromCharCode(65 + (rowIndex % 26));
  const rowSuffix = rowIndex >= 26 ? Math.floor(rowIndex / 26) : "";

  return `${rowLetter}${rowSuffix}${columnIndex}`;
};

export const buildFallbackParkingLayout = (
  spotCount: number,
  columns = DEFAULT_COLUMNS
): ParkingSpot[] =>
  Array.from({ length: Math.max(0, Number(spotCount) || 0) }, (_, index) => ({
    spotId: `spot-${index + 1}`,
    label: getSpotLabel(index, columns),
    row: Math.floor(index / columns) + 1,
    column: (index % columns) + 1,
    type:
      index % columns === 0 || index % columns === columns - 1
        ? "standard"
        : "compact",
    status: "available",
  }));

export const normalizeParkingSpots = (
  source: any,
  fallbackCount = 0
): ParkingSpot[] => {
  const rawSpots = Array.isArray(source)
    ? source
    : Array.isArray(source?.spots)
      ? source.spots
      : [];

  if (rawSpots.length === 0) {
    return buildFallbackParkingLayout(fallbackCount);
  }

  return rawSpots
    .map((spot: any, index: number) => ({
      spotId: String(spot?.spotId || `spot-${index + 1}`),
      label: String(spot?.label || getSpotLabel(index)).toUpperCase(),
      row: Number(spot?.row) || Math.floor(index / DEFAULT_COLUMNS) + 1,
      column: Number(spot?.column) || (index % DEFAULT_COLUMNS) + 1,
      type: String(spot?.type || "standard"),
      status: spot?.status === "booked" ? "booked" : "available",
    }))
    .sort((a: ParkingSpot, b: ParkingSpot) => {
      if (a.row !== b.row) {
        return a.row - b.row;
      }

      return a.column - b.column;
    });
};

export const summarizeParkingSpots = (spots: ParkingSpot[]) => {
  const total = spots.length;
  const booked = spots.filter((spot) => spot.status === "booked").length;

  return {
    total,
    booked,
    available: total - booked,
  };
};
