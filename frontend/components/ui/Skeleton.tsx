'use client'

import React from 'react'

interface SkeletonProps {
  width?: number | string
  height?: number | string
  radius?: number | string
  className?: string
  style?: React.CSSProperties
}

/**
 * Shimmer skeleton block — uses `.skeleton` utility from globals.css
 */
export default function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  className,
  style,
}: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className ?? ''}`}
      aria-hidden
      style={{
        display: 'block',
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  )
}

/**
 * Card-shaped skeleton — matches .glass-card shape
 */
export function SkeletonCard({
  lines = 3,
  showTitle = true,
  minHeight = 120,
}: {
  lines?: number
  showTitle?: boolean
  minHeight?: number
}) {
  return (
    <div
      className="glass-card"
      aria-hidden
      style={{
        padding: 24,
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {showTitle && <Skeleton width="40%" height={14} />}
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '72%' : '100%'}
          height={12}
        />
      ))}
    </div>
  )
}

/**
 * Dashboard-layout skeleton — 3 stat cards + chart + insight
 */
export function DashboardSkeleton() {
  return (
    <div aria-label="Đang tải dashboard" role="status" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <Skeleton width={120} height={12} />
        <Skeleton width={180} height={26} />
        <Skeleton width={220} height={12} />
      </div>
      <div className="glass-card" style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
        <Skeleton width={160} height={48} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="glass-card" style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <Skeleton width="60%" height={10} />
            <Skeleton width="50%" height={18} />
          </div>
        ))}
      </div>
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} minHeight={90} />
    </div>
  )
}

/**
 * Checklist skeleton — progress bar + task rows
 */
export function ChecklistSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-label="Đang tải checklist" role="status" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <Skeleton width={120} height={12} />
        <Skeleton width={180} height={26} />
        <Skeleton width={240} height={12} />
      </div>
      <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="100%" height={10} radius={999} />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="glass-card"
          style={{
            padding: '18px 20px',
            borderLeft: '2px solid var(--border-default)',
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
          }}
        >
          <Skeleton width={32} height={32} radius={10} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width="80%" height={14} />
            <Skeleton width="60%" height={12} />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Skeleton width={60} height={20} radius={999} />
              <Skeleton width={60} height={20} radius={999} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Evening skeleton — compare card + reflection
 */
export function EveningSkeleton() {
  return (
    <div aria-label="Đang tải buổi tối" role="status" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <Skeleton width={100} height={12} />
        <Skeleton width={220} height={26} />
        <Skeleton width={260} height={12} />
      </div>
      <SkeletonCard lines={4} showTitle={true} />
      <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton width="35%" height={12} />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="45%" height={12} />
            <Skeleton width="100%" height={44} radius={4} />
          </div>
        ))}
      </div>
    </div>
  )
}
