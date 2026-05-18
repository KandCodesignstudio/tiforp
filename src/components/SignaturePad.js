import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../utils/colors';

function pointsToPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

export default function SignaturePad({ onConfirm, onCancel }) {
  const [strokes, setStrokes] = useState([]);
  const [layout, setLayout] = useState(null);
  const canvasRef = useRef(null);
  const canvasOrigin = useRef({ x: 0, y: 0 });
  const activeStroke = useRef([]);
  const isDrawing = useRef(false);

  const canvasH = layout?.height ?? 180;
  const canvasW = layout?.width ?? 300;

  const measureCanvas = () => {
    canvasRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
      canvasOrigin.current = { x: px, y: py };
    });
  };

  const handleTouchStart = (e) => {
    measureCanvas();
    const touch = e.nativeEvent.touches[0];
    const x = touch.pageX - canvasOrigin.current.x;
    const y = touch.pageY - canvasOrigin.current.y;
    activeStroke.current = [{ x, y }];
    isDrawing.current = true;
    setStrokes((prev) => [...prev, [{ x, y }]]);
  };

  const handleTouchMove = (e) => {
    if (!isDrawing.current) return;
    const touch = e.nativeEvent.touches[0];
    const x = touch.pageX - canvasOrigin.current.x;
    const y = touch.pageY - canvasOrigin.current.y;
    activeStroke.current = [...activeStroke.current, { x, y }];
    const snap = [...activeStroke.current];
    setStrokes((prev) => [...prev.slice(0, -1), snap]);
  };

  const handleTouchEnd = () => {
    isDrawing.current = false;
  };

  const handleClear = () => {
    setStrokes([]);
    activeStroke.current = [];
    isDrawing.current = false;
  };

  const handleConfirm = () => {
    const validStrokes = strokes.filter((s) => s.length >= 2);
    if (validStrokes.length === 0) return;
    const pathData = validStrokes.map(pointsToPath).join(' ');
    onConfirm(pathData, canvasW, canvasH);
  };

  const isEmpty = strokes.every((s) => s.length < 2);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Client Signature</Text>
      <Text style={styles.subtitle}>Please sign in the box below</Text>

      <View
        ref={canvasRef}
        style={styles.canvas}
        onLayout={(e) => {
          setLayout(e.nativeEvent.layout);
          setTimeout(measureCanvas, 50);
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
        onResponderTerminate={handleTouchEnd}
      >
        {isEmpty && (
          <Text style={styles.placeholder}>Sign here</Text>
        )}
        <Svg width={canvasW} height={canvasH} style={StyleSheet.absoluteFill}>
          {strokes.map((pts, i) => (
            <Path
              key={i}
              d={pointsToPath(pts)}
              stroke="#1A3A6B"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, isEmpty && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={isEmpty}
        >
          <Text style={styles.confirmBtnText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.textLight, marginBottom: 16 },
  canvas: {
    height: 180,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
    backgroundColor: '#fff',
    marginBottom: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: { fontSize: 14, color: Colors.lightGray, fontStyle: 'italic' },
  btnRow: { flexDirection: 'row', gap: 10 },
  clearBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.lightGray, alignItems: 'center',
  },
  clearBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textLight },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.danger, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.danger },
  confirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: Colors.accent, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: Colors.lightGray },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
