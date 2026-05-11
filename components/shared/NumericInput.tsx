'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface NumericInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Input numérique qui accepte virgule ET point comme séparateur décimal.
 * Maintient une chaîne d'affichage interne pour éviter que React
 * écrase la virgule dès qu'elle est tapée.
 */
export function NumericInput({ value, onChange, placeholder, disabled, className }: NumericInputProps) {
  const toDisplay = (n: number) => (n === 0 ? '' : String(n))
  const [display, setDisplay] = useState(() => toDisplay(value))
  const focused = useRef(false)

  // Sync depuis le parent uniquement quand l'input n'est pas actif
  useEffect(() => {
    if (!focused.current) {
      setDisplay(toDisplay(value))
    }
  }, [value])

  const parse = (raw: string): number => {
    const normalized = raw.replace(',', '.')
    const n = parseFloat(normalized)
    return isNaN(n) ? 0 : n
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // Autoriser: chiffres, virgule, point, signe moins, chaîne vide
    if (!/^-?[\d]*[,.]?[\d]*$/.test(raw) && raw !== '') return
    setDisplay(raw)
    onChange(parse(raw))
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    focused.current = true
    e.target.select()
  }

  const handleBlur = () => {
    focused.current = false
    const n = parse(display)
    onChange(n)
    setDisplay(toDisplay(n))
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(className)}
    />
  )
}
