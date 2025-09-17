import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
    width: 32,
    height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 24,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                QI
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    )
}
