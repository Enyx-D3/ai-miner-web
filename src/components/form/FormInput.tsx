import { ElementType } from "react"
import { useFormContext } from "react-hook-form"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import clsx from "clsx"

type IconConfig = {
  icon: ElementType
  onClick?: () => void
  className?: string
  disabled?: boolean
}

interface FormInputProps {
  name: string
  label: string
  placeholder?: string
  description?: string
  type?: string
  disabled?: boolean

  startIcon?: IconConfig
  endIcon?: IconConfig
}

export function FormInput({
  name,
  label,
  placeholder,
  description,
  type = "text",
  disabled = false,
  startIcon,
  endIcon,
}: FormInputProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  const error = errors[name]?.message as string | undefined

  const renderIcon = (config?: IconConfig, align?: "inline-start" | "inline-end") => {
    if (!config) return null

    const Icon = config.icon

    return (
      <InputGroupAddon
        align={align}
        onClick={config.disabled ? undefined : config.onClick}
        className={clsx(
          "transition",
          config.onClick && !config.disabled && "cursor-pointer hover:text-primary",
          config.disabled && "opacity-50 cursor-not-allowed",
          config.className
        )}
      >
        <Icon className="text-muted-foreground" />
      </InputGroupAddon>
    )
  }

  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>

      <InputGroup className="h-12 bg-white">
        {renderIcon(startIcon, "inline-start")}

        <InputGroupInput
          id={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          {...register(name)}
        />

        {renderIcon(endIcon, "inline-end")}
      </InputGroup>

      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}