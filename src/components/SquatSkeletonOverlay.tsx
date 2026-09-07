import React from 'react';
import {
  DetectedKeypoint,
} from '../utils/rtmposeDetector';
import {
  COCO_KEYPOINTS,
  SKELETON_CONNECTIONS,
  POSE_CONFIDENCE_THRESHOLD,
} from '../utils/squatCalculations';

interface SquatSkeletonOverlayProps {
  keypoints: DetectedKeypoint[];
  confidenceThreshold?: number;
}

export const SquatSkeletonOverlay: React.FC<SquatSkeletonOverlayProps> = ({
  keypoints,
  confidenceThreshold = POSE_CONFIDENCE_THRESHOLD,
}) => {
  if (!keypoints || keypoints.length < 17) {
    return null;
  }

  // スクワットで表示する重要キーポイントのインデックス（肩、肘、手首、股関節、膝、足首）
  const relevantIndices = new Set<number>([
    COCO_KEYPOINTS.LEFT_SHOULDER,
    COCO_KEYPOINTS.RIGHT_SHOULDER,
    COCO_KEYPOINTS.LEFT_ELBOW,
    COCO_KEYPOINTS.RIGHT_ELBOW,
    COCO_KEYPOINTS.LEFT_WRIST,
    COCO_KEYPOINTS.RIGHT_WRIST,
    COCO_KEYPOINTS.LEFT_HIP,
    COCO_KEYPOINTS.RIGHT_HIP,
    COCO_KEYPOINTS.LEFT_KNEE,
    COCO_KEYPOINTS.RIGHT_KNEE,
    COCO_KEYPOINTS.LEFT_ANKLE,
    COCO_KEYPOINTS.RIGHT_ANKLE,
  ]);

  // 下肢と体幹の接続（強調表示）
  const lowerBodyAndTrunkConnections = new Set([
    `${COCO_KEYPOINTS.LEFT_SHOULDER}-${COCO_KEYPOINTS.RIGHT_SHOULDER}`,
    `${COCO_KEYPOINTS.LEFT_HIP}-${COCO_KEYPOINTS.RIGHT_HIP}`,
    `${COCO_KEYPOINTS.LEFT_SHOULDER}-${COCO_KEYPOINTS.LEFT_HIP}`,
    `${COCO_KEYPOINTS.RIGHT_SHOULDER}-${COCO_KEYPOINTS.RIGHT_HIP}`,
    `${COCO_KEYPOINTS.LEFT_HIP}-${COCO_KEYPOINTS.LEFT_KNEE}`,
    `${COCO_KEYPOINTS.LEFT_KNEE}-${COCO_KEYPOINTS.LEFT_ANKLE}`,
    `${COCO_KEYPOINTS.RIGHT_HIP}-${COCO_KEYPOINTS.RIGHT_KNEE}`,
    `${COCO_KEYPOINTS.RIGHT_KNEE}-${COCO_KEYPOINTS.RIGHT_ANKLE}`,
  ]);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
    >
      {/* 骨格接続ライン */}
      {SKELETON_CONNECTIONS.map(([idxA, idxB], idx) => {
        const ptA = keypoints[idxA];
        const ptB = keypoints[idxB];
        if (!ptA || !ptB) return null;
        if (ptA.score < confidenceThreshold || ptB.score < confidenceThreshold) {
          return null;
        }

        const connKey = `${idxA}-${idxB}`;
        const isCore = lowerBodyAndTrunkConnections.has(connKey);

        return (
          <line
            key={idx}
            x1={`${ptA.x}%`}
            y1={`${ptA.y}%`}
            x2={`${ptB.x}%`}
            y2={`${ptB.y}%`}
            stroke={isCore ? '#3b82f6' : '#94a3b8'}
            strokeWidth={isCore ? 2.2 : 1.4}
            strokeLinecap="round"
            className="drop-shadow-xs"
          />
        );
      })}

      {/* 関節キーポイント */}
      {keypoints.map((kp, idx) => {
        if (!relevantIndices.has(idx) || kp.score < confidenceThreshold) {
          return null;
        }

        const isLowerOrTrunk =
          idx === COCO_KEYPOINTS.LEFT_HIP ||
          idx === COCO_KEYPOINTS.RIGHT_HIP ||
          idx === COCO_KEYPOINTS.LEFT_KNEE ||
          idx === COCO_KEYPOINTS.RIGHT_KNEE ||
          idx === COCO_KEYPOINTS.LEFT_ANKLE ||
          idx === COCO_KEYPOINTS.RIGHT_ANKLE;

        return (
          <g key={idx}>
            {/* 白フチ付きの関節点 */}
            <circle
              cx={`${kp.x}%`}
              cy={`${kp.y}%`}
              r={isLowerOrTrunk ? 2.2 : 1.6}
              fill="#ffffff"
              stroke={isLowerOrTrunk ? '#2563eb' : '#64748b'}
              strokeWidth={1.2}
              className="drop-shadow-xs"
            />
          </g>
        );
      })}
    </svg>
  );
};
