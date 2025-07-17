'use client'

import { useEffect, useState } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Marker,
} from '@react-google-maps/api'
import { Header } from '@/components/layout/header'
import { TopNav } from '@/components/layout/top-nav'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'

const center = { lat: -33.879, lng: 151.215 } // Darlinghurst
const destination = { lat: -33.867, lng: 150.998 } // Homebush

const libraries: ('places' | 'geometry')[] = ['geometry']

const topNav = [
  { title: 'Dashboard', href: '/dashboard', isActive: false },
  { title: 'Fleet', href: '/fleet', isActive: false },
  { title: 'Delivery', href: '/delivery', isActive: true },
  { title: 'Settings', href: '/settings', isActive: false },
]

const DeliveryMap = () => {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [positionIndex, setPositionIndex] = useState(0)
  const [pathPoints, setPathPoints] = useState<google.maps.LatLngLiteral[]>([])
  const [isMoving, setIsMoving] = useState(false)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyCkY9kX0hSRPO7LFtyyPSL41o3rrhuSfj0',
    libraries,
  })

  useEffect(() => {
    if (!isLoaded) return

    const directionsService = new google.maps.DirectionsService()
    directionsService.route(
      {
        origin: center,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result)

          const overviewPath = result.routes[0].overview_path.map(p => ({
            lat: p.lat(),
            lng: p.lng(),
          }))
          setPathPoints(overviewPath)
        }
      }
    )
  }, [isLoaded])

  useEffect(() => {
    if (!isMoving || pathPoints.length === 0) return

    const interval = setInterval(() => {
      setPositionIndex(prev => {
        if (prev < pathPoints.length - 1) return prev + 1
        clearInterval(interval)
        return prev
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isMoving, pathPoints])

  if (!isLoaded) return <div>Loading map...</div>

  return (
    <>
      <Header>
        <TopNav links={topNav} />
      </Header>

      <Main>
        <div className="relative w-full h-[70vh] rounded-lg overflow-hidden border">
          <GoogleMap
            zoom={13}
            center={center}
            mapContainerStyle={{ width: '100%', height: '100%' }}
          >
            {directions && <DirectionsRenderer directions={directions} />}

            {pathPoints.length > 0 && isMoving && (
              <Marker
                position={pathPoints[positionIndex]}
                icon={{
                  url: '/truck-icon.png',
                  scaledSize: new google.maps.Size(40, 40),
                }}
              />
            )}
          </GoogleMap>

          <Button
            className="absolute top-2 right-2 z-[1000]"
            onClick={() => {
              setPositionIndex(0)
              setIsMoving(true)
            }}
          >
            Start Delivery
          </Button>
        </div>

        <div className="mt-4 p-4 bg-muted rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Trip Details</h2>
          <p><strong>From:</strong> Darlinghurst</p>
          <p><strong>To:</strong> Homebush</p>
          <p><strong>Distance:</strong> approx. 15 km</p>
          <p><strong>Estimated Duration:</strong> approx. 25 mins</p>
        </div>
      </Main>
    </>
  )
}

export default DeliveryMap
