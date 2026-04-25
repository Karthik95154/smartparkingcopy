import { useRouter } from "expo-router";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker, PROVIDER_GOOGLE } from "../../components/MapViewUI";
import { Palette } from "../../constants/theme";
import { requestJson } from "../../constants/api";



const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const SPACING = 12;
const SEARCH_RADIUS_KM = 10;

// Default fallback region (Hyderabad) — change to your city
const DEFAULT_REGION = {
  latitude: 17.385044,
  longitude: 78.486671,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const hasInitializedRef = useRef(false);
  const locationRef = useRef<any>(null);

  const [location, setLocation] = useState<any>(null);
  const [parkingData, setParkingData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [markersReady, setMarkersReady] = useState(false);
  const [activeSearchLocation, setActiveSearchLocation] = useState<any>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const normalizeText = (value: any) =>
    String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const getSuggestionFields = (item: any) => [
    item.name,
    item.area,
    item.city,
    item.landmark,
    item.address,
    item.state,
  ].filter(Boolean);

  const getCleanLocationLabel = (value: string) =>
    value
      .replace(
        /\b(parking|park|lot|zone|area|garage|smart\s*parking)\b/gi,
        " "
      )
      .replace(/\s+/g, " ")
      .trim();

  const getSuggestionCandidates = (item: any) => {
    const candidates = new Map<string, string>();

    getSuggestionFields(item).forEach((field) => {
      const label = String(field).trim();

      if (!label) {
        return;
      }

      const variants = [
        label,
        getCleanLocationLabel(label),
        ...label
          .split(/[,/-]/)
          .map((part) => part.trim())
          .filter(Boolean),
      ];

      variants.forEach((variant) => {
        const normalizedVariant = normalizeText(variant);

        if (!normalizedVariant || normalizedVariant.length < 3) {
          return;
        }

        candidates.set(normalizedVariant, variant);
      });
    });

    return Array.from(candidates.values());
  };

  const isSequentialMatch = (text: string, query: string) => {
    if (!query) {
      return true;
    }

    let queryIndex = 0;

    for (const char of text) {
      if (char === query[queryIndex]) {
        queryIndex += 1;
      }

      if (queryIndex === query.length) {
        return true;
      }
    }

    return false;
  };

  const getTextMatchScore = (text: string, normalizedQuery: string) => {
    if (!normalizedQuery) {
      return 0;
    }

    const normalizedText = normalizeText(text);
    if (!normalizedText) {
      return 0;
    }

    let score = 0;
    const normalizedWords = normalizedText.split(" ").filter(Boolean);

    if (normalizedText === normalizedQuery) score += 1000;
    if (normalizedText.startsWith(normalizedQuery)) score += 320;
    if (normalizedWords.some((word) => word.startsWith(normalizedQuery))) score += 220;
    if (normalizedText.includes(normalizedQuery)) score += 180;
    if (isSequentialMatch(normalizedText, normalizedQuery)) score += 60;

    for (const word of normalizedQuery.split(" ").filter(Boolean)) {
      if (normalizedText.startsWith(word)) score += 50;
      if (normalizedText.includes(word)) score += 25;
    }

    return score;
  };

  const renderHighlightedSuggestion = (label: string, query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return <Text style={styles.suggestionTitle}>{label}</Text>;
    }

    const lowerLabel = label.toLowerCase();
    const lowerQuery = trimmedQuery.toLowerCase();
    const matchIndex = lowerLabel.indexOf(lowerQuery);

    if (matchIndex === -1) {
      return <Text style={styles.suggestionTitle}>{label}</Text>;
    }

    const beforeMatch = label.slice(0, matchIndex);
    const matchText = label.slice(matchIndex, matchIndex + trimmedQuery.length);
    const afterMatch = label.slice(matchIndex + trimmedQuery.length);

    return (
      <Text style={styles.suggestionTitle}>
        {beforeMatch}
        <Text style={styles.suggestionHighlight}>{matchText}</Text>
        {afterMatch}
      </Text>
    );
  };

  const getLocationSuggestions = (data: any[], query: string) => {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return [];
    }

    const suggestions = new Map<
      string,
      { label: string; score: number; distance: number }
    >();

    data.forEach((item) => {
      getSuggestionCandidates(item).forEach((label) => {
        const score = getTextMatchScore(label, normalizedQuery);

        if (score <= 0) {
          return;
        }

        const key = normalizeText(label);
        const existing = suggestions.get(key);
        const distance =
          item.userDistance ?? item.distance ?? Number.MAX_SAFE_INTEGER;

        if (
          !existing ||
          score > existing.score ||
          (score === existing.score && distance < existing.distance)
        ) {
          suggestions.set(key, { label, score, distance });
        }
      });
    });

    return Array.from(suggestions.values())
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }

        return a.label.localeCompare(b.label);
      })
      .slice(0, 6);
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("user");
          router.replace("/login");
        },
      },
    ]);
  };

  // ─── Haversine Distance (km) ───────────────────────────────────────────────
  const getDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getParkingWithinRadius = (
    data: any[],
    centerCoords: any,
    radiusKm: number
  ) => {
    if (!centerCoords) {
      return data
        .map((item: any) => ({
          ...item,
          distance: item.userDistance ?? 0,
        }))
        .sort(
          (a: any, b: any) =>
            (a.userDistance ?? Number.MAX_SAFE_INTEGER) -
            (b.userDistance ?? Number.MAX_SAFE_INTEGER)
        );
    }

    return data
      .map((item: any) => ({
        ...item,
        distance: getDistance(
          centerCoords.latitude,
          centerCoords.longitude,
          item.latitude,
          item.longitude
        ),
      }))
      .filter((item: any) => item.distance <= radiusKm)
      .sort((a: any, b: any) => {
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }

        return (
          (a.userDistance ?? Number.MAX_SAFE_INTEGER) -
          (b.userDistance ?? Number.MAX_SAFE_INTEGER)
        );
      });
  };

  const getMatchedLocationCenter = (data: any[], query: string) => {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return null;
    }

    const matches = data
      .flatMap((item) =>
        getSuggestionCandidates(item).map((label) => {
          return {
            item,
            label,
            key: normalizeText(label),
            score: getTextMatchScore(label, normalizedQuery),
          };
        })
      )
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return (
          (a.item.userDistance ?? Number.MAX_SAFE_INTEGER) -
          (b.item.userDistance ?? Number.MAX_SAFE_INTEGER)
        );
      });

    if (matches.length === 0) {
      return null;
    }

    const bestLabelKey = matches[0].key;
    const bestLabel = matches[0].label;
    const cluster = data.filter((item) =>
      getSuggestionCandidates(item).some(
        (field) => normalizeText(field) === bestLabelKey
      )
    );
    const sourceItems = cluster.length > 0 ? cluster : [matches[0].item];

    return {
      label: bestLabel,
      coords: {
        latitude:
          sourceItems.reduce((sum, item) => sum + item.latitude, 0) /
          sourceItems.length,
        longitude:
          sourceItems.reduce((sum, item) => sum + item.longitude, 0) /
          sourceItems.length,
      },
    };
  };

  const focusResultsOnMap = (coords: any, results: any[]) => {
    if (coords) {
      mapRef.current?.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        },
        800
      );
    } else if (results.length > 0) {
      mapRef.current?.animateCamera(
        {
          center: {
            latitude: results[0].latitude,
            longitude: results[0].longitude,
          },
          zoom: 14,
        },
        { duration: 500 }
      );
    }

    if (results.length > 0) {
      flatListRef.current?.scrollToIndex({ index: 0, animated: true });
    }
  };

  const resetToNearbyParking = (data = parkingData, userCoords = location) => {
    setActiveSearchLocation(null);
    const nearbyResults = getParkingWithinRadius(
      data,
      userCoords,
      SEARCH_RADIUS_KM
    );
    setFilteredData(nearbyResults);
    focusResultsOnMap(userCoords, nearbyResults);
  };

  const handleLocationSearch = async (query = searchText) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      resetToNearbyParking();
      return;
    }

    setIsSearchingLocation(true);

    try {
      let resolvedLocation = getMatchedLocationCenter(parkingData, trimmedQuery);

      if (!resolvedLocation) {
        const geocoded = await Location.geocodeAsync(trimmedQuery);

        if (geocoded.length > 0) {
          resolvedLocation = {
            label: trimmedQuery,
            coords: {
              latitude: geocoded[0].latitude,
              longitude: geocoded[0].longitude,
            },
          };
        }
      }

      if (!resolvedLocation) {
        Alert.alert("Location not found", "Try entering a city, area, or landmark.");
        return;
      }

      const results = getParkingWithinRadius(
        parkingData,
        resolvedLocation.coords,
        SEARCH_RADIUS_KM
      );

      setSearchText(resolvedLocation.label);
      setActiveSearchLocation(resolvedLocation);
      setFilteredData(results);
      focusResultsOnMap(resolvedLocation.coords, results);
    } catch (error) {
      console.log("Search Error:", error);
      Alert.alert("Search failed", "Unable to search this location right now.");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // ─── Fetch Parking Data ────────────────────────────────────────────────────
  const fetchParkingData = async (userCoords: any) => {
    try {
      const data = await requestJson<any[]>(`/parking?ts=${Date.now()}`, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      const parkingList = Array.isArray(data) ? data : [];
      
      console.log("Raw API response:", data);
      console.log("Response length:", parkingList.length);

      const processed = parkingList
        .map((item: any) => {
          const totalSlots = Number(
            item.totalSlots ?? item.total_slots ?? item.slots ?? 0
          );
          const occupiedSlots = Number(
            item.occupiedSlots ?? item.occupied_slots ?? item.occupied ?? 0
          );
          const availableSlots =
            item.availableSlots ?? item.available_slots ?? item.available;

          return {
            ...item,
            totalSlots,
            occupiedSlots,
            availableSlots:
              availableSlots != null
                ? Number(availableSlots)
                : Math.max(0, totalSlots - occupiedSlots),
            // Always parse lat/lng as floats (API may return strings)
            latitude: parseFloat(item.latitude),
            longitude: parseFloat(item.longitude),
            userDistance: userCoords
              ? getDistance(
                  userCoords.latitude,
                  userCoords.longitude,
                  parseFloat(item.latitude),
                  parseFloat(item.longitude)
                )
              : 0,
          };
        })
        //  Filter out any items with invalid coordinates
        .filter(
          (item: any) =>
            !isNaN(item.latitude) &&
            !isNaN(item.longitude) &&
            item.latitude !== 0 &&
            item.longitude !== 0
        )
        // Keep every valid parking spot so search can cover the full dataset.
        .sort((a: any, b: any) => {
          if ((a.distance ?? 0) !== (b.distance ?? 0)) {
            return (a.distance ?? 0) - (b.distance ?? 0);
          }

          return String(a.name ?? "").localeCompare(String(b.name ?? ""));
        });

      // Debug log — remove after confirming markers appear
      console.log(
        "Parking markers loaded:",
        processed.map((p: any) => ({
          name: p.name,
          lat: p.latitude,
          lng: p.longitude,
          distance: p.userDistance,
        }))
      );
      console.log("Total markers to display:", processed.length);

      // Debug: Log that markers are being prepared
      console.log("Data set, preparing markers...");

      setParkingData(processed);
      setFilteredData(
        getParkingWithinRadius(processed, userCoords, SEARCH_RADIUS_KM)
      );
      setActiveSearchLocation(null);
      setMarkersReady(true);
    } catch (err) {
      console.log("Fetch Error:", err);
      Alert.alert("Error", "Could not load parking data. Check your server.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Get Current Location ─────────────────────────────────────────────────
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission denied");
        await fetchParkingData(null);
        return;
      }

      const loc =
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }).catch(() => Location.getLastKnownPositionAsync())) || null;

      const coords = loc?.coords;
      if (!coords) {
        throw new Error("Location unavailable");
      }

      console.log("Correct Location:", coords);

      locationRef.current = coords;
      setLocation(coords);
      setSearchText("");
      setActiveSearchLocation(null);

      mapRef.current?.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        800
      );

      await fetchParkingData(coords);
    } catch (err) {
      console.log("Location Error:", err);

      locationRef.current = null;
      setLocation(null);
      setSearchText("");
      setActiveSearchLocation(null);

      await fetchParkingData(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let isFetching = false;

    const refreshParkingData = async () => {
      if (!isMounted || isFetching) {
        return;
      }

      isFetching = true;
      try {
        await fetchParkingData(locationRef.current ?? null);
      } finally {
        isFetching = false;
      }
    };

    const initializeParkingData = async () => {
      if (hasInitializedRef.current) {
        return;
      }

      hasInitializedRef.current = true;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted) {
        return;
      }

      if (status !== "granted") {
        await refreshParkingData();
        return;
      }

      await getCurrentLocation();
    };

    initializeParkingData();

    const intervalId = setInterval(() => {
      refreshParkingData();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const locationSuggestions = getLocationSuggestions(parkingData, searchText);
  const showSuggestions =
    searchText.trim().length > 0 &&
    locationSuggestions.length > 0 &&
    normalizeText(searchText) !==
      normalizeText(activeSearchLocation?.label ?? "");
  const resultsLabel = activeSearchLocation
    ? `Showing parking within ${SEARCH_RADIUS_KM} km of ${activeSearchLocation.label}`
    : location
      ? `Showing parking within ${SEARCH_RADIUS_KM} km of your location`
      : "Showing all parking locations";
  const emptyStateText = activeSearchLocation
    ? `No parking spots found within ${SEARCH_RADIUS_KM} km of ${activeSearchLocation.label}`
    : `No parking spots found within ${SEARCH_RADIUS_KM} km of your location`;

  // ─── Carousel → Map sync ──────────────────────────────────────────────────
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const item = viewableItems[0].item;
      mapRef.current?.animateCamera(
        {
          center: { latitude: item.latitude, longitude: item.longitude },
          zoom: 15,
        },
        { duration: 500 }
      );
    }
  }).current;

  // ─── Loading Screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Finding parking near you...</Text>
      </View>
    );
  }

  // ─── Main UI ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* 5: initialRegion uses live location or default fallback */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        key={markersReady ? "ready" : "loading"}
        zoomControlEnabled={true}
        rotateEnabled={false}
        scrollEnabled={true} 
        initialRegion={
          location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : DEFAULT_REGION
        }
      >
        {/*   6: Only render markers after data + map is ready */}
        {markersReady &&
          filteredData.map((item) => (
            <Marker
              key={item.id}
              coordinate={{
                latitude: item.latitude,
                longitude: item.longitude,
              }}
              title={item.name}
              description={`${item.availableSlots} free / ${item.totalSlots} total • ₹${item.pricePerHour}/hr`}
              pinColor="#fb3600"
              tracksViewChanges={true}
              onPress={() => {
                console.log("Marker pressed:", item.name);
                router.push({
                  pathname: "/details",
                  params: { ...item, id: item.id },
                });
              }}
            />
          ))}
        {/* User Location Marker */}
        {location && (
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title="You are here"
            isUserLocation={true}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── Search Bar ── */}
      <View style={styles.searchWrapper}>
        <LinearGradient
          colors={[Palette.bg.light, "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.searchContainer}
        >
          <TouchableOpacity
            style={styles.searchActionBtn}
            onPress={() => handleLocationSearch(searchText)}
          >
            <Ionicons name="search" size={20} color={Palette.primary} />
          </TouchableOpacity>
          <TextInput
            placeholder="Search area, city, or landmark"
            style={styles.searchInput}
            value={searchText}
            placeholderTextColor="#94A3B8"
            onChangeText={setSearchText}
            returnKeyType="search"
            onSubmitEditing={() => handleLocationSearch(searchText)}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchText("");
                resetToNearbyParking();
              }}
              style={styles.clearSearchBtn}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={Palette.text.tertiary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtnSmall}
          >
            <Ionicons name="log-out-outline" size={20} color={Palette.danger} />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.resultsInfoRow}>
          <View style={styles.resultsInfoBadge}>
            <Ionicons
              name="navigate-circle-outline"
              size={16}
              color={Palette.primary}
            />
            <Text style={styles.resultsInfoText}>{resultsLabel}</Text>
          </View>
          {activeSearchLocation && (
            <TouchableOpacity
              style={styles.nearbyResetBtn}
              onPress={() => {
                setSearchText("");
                resetToNearbyParking();
              }}
            >
              <Text style={styles.nearbyResetText}>Near Me</Text>
            </TouchableOpacity>
          )}
        </View>

        {showSuggestions && (
          <View style={styles.suggestionsContainer}>
            {locationSuggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion.label}
                style={styles.suggestionItem}
                onPress={() => handleLocationSearch(suggestion.label)}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={Palette.primary}
                />
                <View style={styles.suggestionTextWrap}>
                  {renderHighlightedSuggestion(suggestion.label, searchText)}
                  <Text style={styles.suggestionSubtitle}>
                    Show parking within {SEARCH_RADIUS_KM} km of this location
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isSearchingLocation && (
          <View style={styles.searchingState}>
            <ActivityIndicator size="small" color={Palette.primary} />
            <Text style={styles.searchingStateText}>Searching location...</Text>
          </View>
        )}
      </View>

      {/* ── Recenter Button ── */}
      <TouchableOpacity style={styles.recenterBtn} onPress={getCurrentLocation}>
        <LinearGradient
          colors={Palette.gradients.primary}
          style={styles.recenterGradient}
        >
          <Ionicons name="locate" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Parking Cards Carousel ── */}
      <View style={styles.carouselContainer}>
        {filteredData.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="car-outline" size={32} color="#94A3B8" />
            <Text style={styles.emptyText}>{emptyStateText}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredData}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + SPACING}
            decelerationRate="fast"
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            contentContainerStyle={{
              paddingHorizontal: (width - CARD_WIDTH) / 2,
            }}
            renderItem={({ item }) => (
              <LinearGradient
                colors={["#FFFFFF", Palette.bg.lighter]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: "/details",
                      params: { ...item, id: item.id },
                    })
                  }
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.slotsRow}>
                        <Ionicons
                          name="car"
                          size={16}
                          color={item.availableSlots > 10 ? Palette.success : Palette.danger}
                        />
                        <Text
                          style={[
                            styles.slotsText,
                            {
                              color:
                                item.availableSlots > 10 ? Palette.success : Palette.danger,
                            },
                          ]}
                        >
                          {item.availableSlots} free / {item.totalSlots} total
                        </Text>
                      </View>
                    </View>
                    <View style={styles.distanceBadge}>
                      <Ionicons name="navigate" size={16} color={Palette.primary} />
                      <Text style={styles.distanceText}>
                        {item.distance?.toFixed(1)} km
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.priceLabel}>Price per hour</Text>
                      <Text style={styles.priceValue}>
                        ₹{item.pricePerHour}
                        <Text style={styles.perHr}>/hr</Text>
                      </Text>
                    </View>
                    <LinearGradient
                      colors={Palette.gradients.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.bookBtn}
                    >
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                      <Text style={styles.bookBtnText}>Book</Text>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              </LinearGradient>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  map: { width: "100%", height: "100%" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Palette.bg.lighter,
  },
  loadingText: {
    marginTop: 12,
    color: Palette.text.secondary,
    fontSize: 15,
    fontWeight: "500",
  },

  // ── Marker ──
  userDotOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6366F1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  markerImage: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },

  // ── Search ──
  searchWrapper: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  searchActionBtn: {
    padding: 4,
  },

  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: Palette.text.primary,
  },

  clearSearchBtn: {
    padding: 6,
    marginLeft: 6,
  },

  logoutBtnSmall: {
    padding: 8,
    marginLeft: 8,
  },

  resultsInfoRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  resultsInfoBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },

  resultsInfoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: Palette.text.primary,
  },

  nearbyResetBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  nearbyResetText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },

  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },

  suggestionTextWrap: {
    flex: 1,
  },

  suggestionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Palette.text.primary,
  },

  suggestionHighlight: {
    color: Palette.primary,
    fontWeight: "800",
  },

  suggestionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Palette.text.secondary,
  },

  searchingState: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },

  searchingStateText: {
    fontSize: 13,
    fontWeight: "600",
    color: Palette.text.secondary,
  },

  // ── Recenter ──
  recenterBtn: {
    position: "absolute",
    bottom: 240,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  recenterGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Carousel ──
  carouselContainer: { position: "absolute", bottom: 30, width: "100%" },

  card: {
    width: CARD_WIDTH,
    marginHorizontal: SPACING / 2,
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Palette.text.primary,
    marginBottom: 6,
  },

  slotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  slotsText: {
    color: Palette.text.secondary,
    fontSize: 13,
    fontWeight: "600",
  },

  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Palette.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  distanceText: {
    color: Palette.primary,
    fontWeight: "700",
    fontSize: 12,
  },

  divider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: 12,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  priceLabel: {
    fontSize: 12,
    color: Palette.text.tertiary,
    fontWeight: "500",
    marginBottom: 2,
  },

  priceValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Palette.text.primary,
  },

  perHr: {
    fontSize: 12,
    color: Palette.text.secondary,
    fontWeight: "500",
  },

  bookBtn: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    gap: 6,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  bookBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  // ── Empty State ──
  emptyCard: {
    backgroundColor: "#fff",
    marginHorizontal: (width - CARD_WIDTH) / 2,
    width: CARD_WIDTH,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  emptyText: {
    color: Palette.text.tertiary,
    fontSize: 15,
    marginTop: 12,
    fontWeight: "500",
  },
});
