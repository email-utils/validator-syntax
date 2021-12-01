interface EmailValidatorConfig {
  local: LocalValidateConfig
  domain: DomainValidateConfig
}
interface EmailValidatorParam {
  local?: LocalValidateConfig
  domain?: DomainValidateConfig
}
type LocalValidateConfig = {
  alphaUpper: boolean
  alphaLower: boolean
  numeric: boolean
  period: boolean
  printable: boolean
  quote: boolean
  hyphen: boolean
  spaces: boolean
}

type DomainValidateConfig = {
  alphaUpper: boolean
  alphaLower: boolean
  numeric: boolean
  period: boolean
  hyphen: boolean
  tld: boolean
  localhost: boolean
  charsBeforeDot: number // -1 means don't check.
  charsAfterDot: number // -1 means don't check.
}
