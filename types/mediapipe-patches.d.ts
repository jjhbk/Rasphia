declare module "@mediapipe/face_mesh/face_mesh_connections" {
  import { LandmarkConnectionArray } from "@mediapipe/face_mesh";

  export const FACEMESH_LIPS: LandmarkConnectionArray;
  export const FACEMESH_LEFT_EYE: LandmarkConnectionArray;
  export const FACEMESH_RIGHT_EYE: LandmarkConnectionArray;
  export const FACEMESH_LEFT_EYEBROW: LandmarkConnectionArray;
  export const FACEMESH_RIGHT_EYEBROW: LandmarkConnectionArray;
  export const FACEMESH_FACE_OVAL: LandmarkConnectionArray;
}
