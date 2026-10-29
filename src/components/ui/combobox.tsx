"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "cn"

export type ComboboxOption = {
  value: string
  label: string
}

/**
 * Searchable single-select input. Use it instead of `Select` when the option
 * list is long enough that typing to filter is required (e.g. wilayah).
 */
function Combobox({
  options,
  value,
  onValueChange,
  placeholder,
  emptyText = "Tidak ada hasil.",
  disabled,
  id,
  className,
}: {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  id?: string
  className?: string
}) {
  const selected = React.useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  )

  return (
    <ComboboxPrimitive.Root
      items={options}
      value={selected}
      onValueChange={(next) => onValueChange(next ? next.value : "")}
      disabled={disabled}
      itemToStringLabel={(option: ComboboxOption) => option.label}
      // Keep the best match highlighted so Enter selects it instead of
      // submitting the surrounding form.
      autoHighlight
    >
      <div className="relative">
        <ComboboxPrimitive.Input
          id={id}
          data-slot="combobox-input"
          placeholder={placeholder}
          className={cn(
            "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
            className
          )}
        />
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          sideOffset={4}
          align="start"
          className="isolate z-50"
        >
          <ComboboxPrimitive.Popup
            data-slot="combobox-popup"
            className="relative isolate z-50 max-h-60 w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <ComboboxPrimitive.Empty className="px-2 py-4 text-center text-sm text-muted-foreground empty:hidden">
              {emptyText}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List className="scroll-py-1 p-1">
              {(option: ComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={option.value}
                  value={option}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  <ComboboxPrimitive.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  )
}

export { Combobox }
