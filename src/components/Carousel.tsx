'use client'

import React from 'react'
import {
  Carousel as ShadcnCarousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { type EmblaOptionsType } from 'embla-carousel'
import { cn } from '@/libs/utils'

type CarouselProps = {
  slides: React.ReactNode[]
  options?: EmblaOptionsType
  className?: string
  slideClassName?: string
}

export default function Carousel({
  slides,
  options,
  className,
  slideClassName,
}: CarouselProps) {
  return (
    <ShadcnCarousel
      opts={options}
      className={cn("w-full relative group", className)}
    >
      <CarouselContent className="-ml-4">
        {slides.map((slide, index) => (
          <CarouselItem key={index} className={cn("pl-4", slideClassName)}>
             {slide}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex -left-12 h-12 w-12 border-none bg-secondary/50 hover:bg-secondary text-secondary-foreground" />
      <CarouselNext className="hidden md:flex -right-12 h-12 w-12 border-none bg-secondary/50 hover:bg-secondary text-secondary-foreground" />
    </ShadcnCarousel>
  )
}
