import FillImage from './FillImage'

/**
 * A poster inside a `.poster-slot` frame: the whole poster, never cropped, on
 * top of a blurred, darkened copy of the same file that fills whatever the
 * poster does not. The frame's hatch and seal show when there is no file or it
 * fails to load (FillImage renders nothing for a dead link).
 */
export default function PosterImage({ src, sizes, priority }: { src: string; sizes: string; priority?: boolean }) {
  return (
    <>
      <FillImage src={src} sizes={sizes} className="object-cover poster-backdrop" />
      <FillImage src={src} sizes={sizes} priority={priority} className="object-contain" />
    </>
  )
}
