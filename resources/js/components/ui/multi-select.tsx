import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-10 px-3",
            className
          )}
        >
          <div className="flex items-center gap-1 flex-1 overflow-hidden">
            {selected.length === 0 ? (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            ) : (
              <>
                <span className="truncate text-sm">{selectedLabels[0]}</span>
                {selected.length > 1 && (
                  <span className="text-muted-foreground text-sm whitespace-nowrap">
                    +{selected.length - 1} more
                  </span>
                )}
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full min-w-[200px] max-h-[300px] overflow-y-auto" align="start">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={(e) => {
              e.preventDefault()
              handleSelect(option.value)
            }}
            className="cursor-pointer"
          >
            <Checkbox
              checked={selected.includes(option.value)}
              onCheckedChange={() => handleSelect(option.value)}
            />
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

