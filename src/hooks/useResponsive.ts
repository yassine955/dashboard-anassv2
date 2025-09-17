"use client"

import { useState, useEffect } from 'react'

interface BreakpointConfig {
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

const defaultBreakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

export function useResponsive(breakpoints: BreakpointConfig = defaultBreakpoints) {
  const [screenSize, setScreenSize] = useState({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLarge: false,
    isXLarge: false
  })

  useEffect(() => {
    function updateScreenSize() {
      const width = window.innerWidth
      const height = window.innerHeight

      setScreenSize({
        width,
        height,
        isMobile: width < breakpoints.sm,
        isTablet: width >= breakpoints.sm && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg && width < breakpoints.xl,
        isLarge: width >= breakpoints.xl && width < breakpoints['2xl'],
        isXLarge: width >= breakpoints['2xl']
      })
    }

    // Set initial size
    updateScreenSize()

    // Listen for resize events
    window.addEventListener('resize', updateScreenSize)

    return () => window.removeEventListener('resize', updateScreenSize)
  }, [breakpoints])

  return {
    ...screenSize,
    isSmallScreen: screenSize.isMobile || screenSize.isTablet,
    isLargeScreen: screenSize.isDesktop || screenSize.isLarge || screenSize.isXLarge,
    // Utility functions for responsive values
    responsive: {
      fontSize: (base: number, mobile?: number) => screenSize.isMobile && mobile ? mobile : base,
      margin: (base: number, mobile?: number) => screenSize.isMobile && mobile ? mobile : base,
      chartHeight: () => screenSize.isMobile ? 250 : screenSize.isTablet ? 300 : 350,
      gridCols: (mobile: number, tablet: number, desktop: number) =>
        screenSize.isMobile ? mobile : screenSize.isTablet ? tablet : desktop
    }
  }
}

export function useBreakpoint(breakpoint: keyof BreakpointConfig) {
  const [isMatch, setIsMatch] = useState(false)

  useEffect(() => {
    function updateMatch() {
      setIsMatch(window.innerWidth >= defaultBreakpoints[breakpoint])
    }

    updateMatch()
    window.addEventListener('resize', updateMatch)

    return () => window.removeEventListener('resize', updateMatch)
  }, [breakpoint])

  return isMatch
}