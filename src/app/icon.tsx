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
export default async function Icon() {
    // Fetch the favicon image
    const faviconResponse = await fetch(new URL('/favicon.png', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
    const faviconBuffer = await faviconResponse.arrayBuffer()
    const base64 = Buffer.from(faviconBuffer).toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={dataUrl}
                    alt="Favicon"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                    }}
                />
            </div>
        ),
        {
            ...size,
        }
    )
}
