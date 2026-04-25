import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View } from 'react-native';
import { GoogleMap, useJsApiLoader, Marker as GoogleMarker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const MapView = forwardRef((props: any, ref: any) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyBXtfhg-lW1uZHQaKD9gJkLPnNysj63Sus"
  });

  const [map, setMap] = useState<any>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any) => {
      if (map && region) {
        map.panTo({ lat: region.latitude, lng: region.longitude });
      }
    },
    animateCamera: (config: any) => {
      if (map && config.center) {
        map.panTo({ lat: config.center.latitude, lng: config.center.longitude });
        if (config.zoom) map.setZoom(config.zoom);
      }
    }
  }));

  if (!isLoaded) {
    return <View style={[{flex: 1, backgroundColor: '#e2e8f0'}, props.style]} />;
  }

  // We parse the children to find Marker components and render GoogleMarkers instead
  const markers = React.Children.map(props.children, child => {
    if (React.isValidElement(child)) {
      const markerChild = child as React.ReactElement<any>;
      if (!markerChild.props.coordinate) {
        return null;
      }

      let iconUrl;
      if (markerChild.props.isUserLocation) {
        iconUrl = "data:image/svg+xml;utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='8' fill='%23007AFF' stroke='white' stroke-width='2'/></svg>";
      }
      return (
        <GoogleMarker 
          position={{ lat: markerChild.props.coordinate.latitude, lng: markerChild.props.coordinate.longitude }}
          onClick={markerChild.props.onPress}
          title={markerChild.props.title}
          icon={iconUrl ? { url: iconUrl } : undefined}
        />
      );
    }
    return null;
  });

  return (
    <View style={props.style}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={props.initialRegion ? {
          lat: props.initialRegion.latitude,
          lng: props.initialRegion.longitude
        } : { lat: 17.385044, lng: 78.486671 }}
        zoom={14}
        onLoad={setMap}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
        }}
      >
        {markers}
      </GoogleMap>
    </View>
  );
});

MapView.displayName = 'MapView';
export default MapView;

// Dummy marker component. MapView extracts its props directly above.
export const Marker = (props: any) => null;
export const PROVIDER_GOOGLE = "google";
