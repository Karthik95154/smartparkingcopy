import React from "react";
import MapView, {
  Marker as NativeMarker,
  PROVIDER_GOOGLE as NATIVE_PROVIDER_GOOGLE,
} from "react-native-maps";

export default MapView;

export const Marker = (props: any) => <NativeMarker {...props} />;

export const PROVIDER_GOOGLE = NATIVE_PROVIDER_GOOGLE;
