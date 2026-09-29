export interface EmailValidatorConfig {
  local: LocalValidateConfig;
  domain: DomainValidateConfig;
}
export interface EmailValidatorParam {
  local?: Partial<LocalValidateConfig>;
  domain?: Partial<DomainValidateConfig>;
}
export type LocalValidateConfig = {
  alphaUpper: boolean;
  alphaLower: boolean;
  numeric: boolean;
  period: boolean;
  printable: boolean;
  quote: boolean;
  hyphen: boolean;
  spaces: boolean;
};

export type DomainValidateConfig = {
  alphaUpper: boolean;
  alphaLower: boolean;
  numeric: boolean;
  period: boolean;
  hyphen: boolean;
  tld: boolean;
  localhost: boolean;
  charsBeforeDot: number; // -1 means don't check.
  charsAfterDot: number; // -1 means don't check.
};
