export async function getCurrentCoordinates(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation_not_supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('permission_denied'))
        } else {
          reject(new Error('position_unavailable'))
        }
      },
    )
  })
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; street: string; houseNumber: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('reverse_geocode_failed')
  }
  const data = await res.json()
  const address = data.address || {}
  return {
    city: address.city || address.town || address.village || '',
    street: address.road || '',
    houseNumber: address.house_number || '',
  }
}
