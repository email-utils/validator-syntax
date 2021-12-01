import { expect } from 'chai'
import { describe, it } from 'mocha'
import EmailSyntaxValidator from '../src'

const requiresPrintable = [
  {
    email: 'disposablestyleemailwith+symbol@example.com',
    description: 'Emails with symbols',
  },
  {
    email: 'username+tag+sorting@example.com',
    description: 'Emails with tags and sorting',
  },
  {
    email: 'test/test@test.com',
    description: 'Emails with slashes',
  },
  {
    email: 'mailhost.com!username@example.org',
    description: 'Emails with bangified host routes',
  },
  {
    email: 'user%example.com@example.org',
    description: 'Emails with % escaped mail routes',
  },
  {
    email: 'disposablestyleemailwith+symbol@example.com',
    description: 'Emails with symbols',
  },
  {
    email: 'username+tag+sorting@example.com',
    description: 'Emails with tags and sorting',
  },
]

const alwaysValidEmails = [
  {
    email: 'simple@example.com',
    description: 'Simple emails',
  },

  {
    email: 'x@example.com',
    description: 'Emails with a single letter local',
  },

  // This scenario has to be extremely rare and is very difficult to setup. Ignoring for now.
  // {
  //   // eslint-disable-next-line max-len, no-useless-escape
  //   email:
  //     '"very.(),:;<>[]".VERY."very@\\ "very".unusual"@strange.example.com',
  //   description: 'Emails with a very unusual set of characters',
  //
  // },

  {
    email: 'admin@test.co',
    description: 'Email with short Top Level Domain',
  },
  {
    email: 'test@gmail.com',
    description: 'Gmail emails',
  },
]

const requiresSpacesSurroundedByQuote = [
  {
    email: '" "@example.org',
    description: 'Email with space between quotes for username',
  },
]

const requiresDoublePeriodsInQuotes = [
  {
    email: '"john..doe"@example.com',
    description: 'Emails with 2 dots together in the local when in quotes',
  },
]

const requiresUppercaseLetters = [
  {
    email: 'tesT@example.com',
    description: 'Emails with uppercase letters',
  },
]

const requiresNumbers = [
  {
    email: 'test1@example.com',
    description: 'Emails with numbers',
  },
]

const requiresPeriods = [
  {
    email: 'very.common@example.com',
    description: 'Emails with periods',
  },
]

const requiresQuotes = [
  {
    email: '"justactually"@example.com',
    description: 'Emails with quotes',
  },
]

const requiresPeriodsAndQuotes = [
  {
    email: 'just."actually".right@example.com',
    description: 'Emails with internal quotes that are surrounded by periods',
  },
]

const requiresLocalHyphens = [
  {
    email: 'fully-qualified-domain@example.com',
    description: 'Emails with fully qualified domains',
  },
  {
    email: 'otheremail-with-hyphen@example.com',
    description: 'Emails with hyphens',
  },
  {
    email: 'user-@example.org',
    description:
      'Emails that end in non-alphanumeric characters that are in the allowed printable characters',
  },
]

const requiresHyphens = [
  {
    email: 'example-indeed@strange-example.com',
    description: 'Emails with a hyphenated domain',
  },
]

const requiresDomainHyphens = [
  {
    email: 'exampleindeed@strange-example.com',
    description: 'Emails with a hyphenated domain',
  },
]

const requiresNoTldCheck = [
  {
    email: 'test@example.thisisnotavalidtld',
    description: 'Emails that are non-icann tlds',
  },
]

const requiresNoDomainNameLengthCheck = [
  {
    email: 'james@g.com',
    description:
      'Emails with periods that are less than 1 chars from the domain beginning',
  },
]

const requiresNoTldLengthCheck = [
  {
    email: 'james@google.c',
    description:
      'Emails with periods that are less than 2 chars from the end of the domain',
  },
]

function runValidations(validations, emailValidator, expected) {
  for (let v = 0; v < validations.length; v++) {
    const validation = validations[v]

    it(`${validation.description} are valid (${validation.email})`, async () =>
      expect(await emailValidator.validate(validation.email)).to.equal(
        expected
      ))
  }
}

describe('Check valid emails. | Base config.', async () => {
  const emailValidator = new EmailSyntaxValidator()

  const validations = [
    ...alwaysValidEmails,
    ...requiresSpacesSurroundedByQuote,
    ...requiresDoublePeriodsInQuotes,
    ...requiresUppercaseLetters,
    ...requiresNumbers,
    ...requiresPeriods,
    ...requiresPrintable,
    ...requiresQuotes,
    ...requiresPeriodsAndQuotes,
    ...requiresLocalHyphens,
    ...requiresDomainHyphens,
    ...requiresHyphens,
  ]

  runValidations(validations, emailValidator, true)
})

describe('Check invalid emails. | Base config.', async () => {
  const emailValidator = new EmailSyntaxValidator()

  const emailWOAt = 'Abc.example.com'
  it(`Emails without at symbol are invalid. (${emailWOAt})`, async () =>
    expect(await emailValidator.validate(emailWOAt)).to.equal(false))
  const emailWAtFirst = '@Abc.example.com'
  it(`Emails with the at symbol at the beginning are invalid. (${emailWAtFirst})`, async () =>
    expect(await emailValidator.validate(emailWAtFirst)).to.equal(false))
  const emailWMultiAts = 'A@b@c@example.com'
  it(`Emails with multiple ats are invalid. (${emailWMultiAts})`, async () =>
    expect(await emailValidator.validate(emailWMultiAts)).to.equal(false))
  const emailWUnquotedSpecialChars = 'a"b(c)d,e:f;g<h>i[j\\k]l@example.com'
  it(`Emails with unquoted special chars are invalid. (${emailWUnquotedSpecialChars})`, async () =>
    expect(await emailValidator.validate(emailWUnquotedSpecialChars)).to.equal(
      false
    ))
  const emailWQuoteButNoDots = 'just"not"right@example.com'
  it(`Emails with quotes that are not the only thing but not seperated by dots are invalid. (${emailWQuoteButNoDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButNoDots)).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotesNoBackslash =
    'this is"notallowed@example.com'
  it(`Emails with spaces, quotes, and backslashes outside of a quotes and not proceeded by a backslash are invalid. (${emailWSpacesQuotesBackslashOutsideQuotesNoBackslash})`, async () =>
    expect(
      await emailValidator.validate(
        emailWSpacesQuotesBackslashOutsideQuotesNoBackslash
      )
    ).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotes =
    'this still"not\\allowed@example.com'
  it(`Emails with spaces, quotes, and backslashes outside of a quotes are invalid. (${emailWSpacesQuotesBackslashOutsideQuotes})`, async () =>
    expect(
      await emailValidator.validate(emailWSpacesQuotesBackslashOutsideQuotes)
    ).to.equal(false))
  const emailWTooLongLocal =
    '1234567890123456789012345678901234567890123456789012345678901234+x@example.com'
  it(`Emails with more than 64 chars are invalid. (${emailWTooLongLocal})`, async () =>
    expect(await emailValidator.validate(emailWTooLongLocal)).to.equal(false))
  const emailWUnderscoredDomain =
    'i_like_underscore@but_its_not_allowed_in_this_part.example.com'
  it(`Emails with underscores in the domain are invalid. (${emailWUnderscoredDomain})`, async () =>
    expect(await emailValidator.validate(emailWUnderscoredDomain)).to.equal(
      false
    ))
  const emailWIconCharacters = 'QA☕CHOCOLATE☕@test.com'
  it(`Emails with icon characters invalid. (${emailWIconCharacters})`, async () =>
    expect(await emailValidator.validate(emailWIconCharacters)).to.equal(false))
  const emailWODomainPeriod = 'james@google'
  it(`Emails without a period in the domain are invalid. (${emailWODomainPeriod})`, async () =>
    expect(await emailValidator.validate(emailWODomainPeriod)).to.equal(false))
  const emailWPeriodNearEnd = 'james@google.c'
  it(`Emails with periods that are less than 2 chars from the end of the domain are invalid. (${emailWPeriodNearEnd})`, async () =>
    expect(await emailValidator.validate(emailWPeriodNearEnd)).to.equal(false))
  const emailWPeriodNearBeginning = 'james@g.com'
  it(`Emails with periods that are less than 1 chars from the domain beginning are invalid. (${emailWPeriodNearBeginning})`, async () =>
    expect(await emailValidator.validate(emailWPeriodNearBeginning)).to.equal(
      false
    ))
  const emailWSpaceButNoQuotes = 'james richards@google.com'
  it(`Emails with spaces but no quotes are invalid. (${emailWSpaceButNoQuotes})`, async () =>
    expect(await emailValidator.validate(emailWSpaceButNoQuotes)).to.equal(
      false
    ))
  const emailWSpaceButOnlyQuoteBefore = 'james" richards@google.com'
  it(`Emails with spaces but only a quote before or after are invlaid. (${emailWSpaceButOnlyQuoteBefore})`, async () =>
    expect(
      await emailValidator.validate(emailWSpaceButOnlyQuoteBefore)
    ).to.equal(false))
  const emailWInvalidDomainChars = 'james@cb$.com'
  it(`Emails with invalid chars in the domain are invalid. (${emailWInvalidDomainChars})`, async () =>
    expect(await emailValidator.validate(emailWInvalidDomainChars)).to.equal(
      false
    ))
  const emailWQuoteButMissingDots = 'just."not"right@example.com'
  it(`Emails with quotes that are not the only thing but are missing some of the dots that should surround quotes are invalid. (${emailWQuoteButMissingDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButMissingDots)).to.equal(
      false
    ))
  const doubleDotBeforeAt = 'john..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAt})`, async () =>
    expect(await emailValidator.validate(doubleDotBeforeAt)).to.equal(false))

  const doubleDotBeforeAtAndOneQuote = '"john..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndOneQuote})`, async () =>
    expect(
      await emailValidator.validate(doubleDotBeforeAtAndOneQuote)
    ).to.equal(false))
  const doubleDotBeforeAtAndTwoQuotesBeforePeriods = '"john"..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndTwoQuotesBeforePeriods})`, async () =>
    expect(
      await emailValidator.validate(doubleDotBeforeAtAndTwoQuotesBeforePeriods)
    ).to.equal(false))
  const doubleDotAfterAt = 'john.doe@example..com'
  it(`Emails with 2 dots together after the at are invalid. (${doubleDotAfterAt})`, async () =>
    expect(await emailValidator.validate(doubleDotAfterAt)).to.equal(false))
  const emailWInternalQuoteWDots = 'just."not."right@example.com'
  it(`Emails with quotes that have periods next to them but are not onside are invalid. (${emailWInternalQuoteWDots})`, async () =>
    expect(await emailValidator.validate(emailWInternalQuoteWDots)).to.equal(
      false
    ))
  const emailInvalidTld = 'test@example.thisisnotavalidtld'
  it(`Emails that are non-icann tlds invalid. (${emailInvalidTld})`, async () =>
    expect(await emailValidator.validate(emailInvalidTld)).to.equal(false))

  const percentEscapedMailRoute = 'user%example@example.org'
  it(`Emails with % escaped mail routes that are localhost are invalid. (${percentEscapedMailRoute})`, async () =>
    expect(await emailValidator.validate(percentEscapedMailRoute)).to.equal(
      false
    ))

  const emailWTLD = 'admin@mailserver1'
  it(`Localhost domains are invalid. (${emailWTLD})`, async () =>
    expect(await emailValidator.validate(emailWTLD)).to.equal(false))
})

describe('Check valid emails. | W/Out spaces surrounded by quotes.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    local: {
      spaces: false,
    },
  })

  const validations = [
    ...alwaysValidEmails,
    ...requiresDoublePeriodsInQuotes,
    ...requiresUppercaseLetters,
    ...requiresNumbers,
    ...requiresPeriods,
    ...requiresPrintable,
    ...requiresQuotes,
    ...requiresPeriodsAndQuotes,
    ...requiresLocalHyphens,
    ...requiresDomainHyphens,
    ...requiresHyphens,
  ]

  runValidations(validations, emailValidator, true)
})

describe('Check valid emails. | W/Out uppercase letters.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    local: {
      alphaUpper: false,
    },
  })

  const validations = [
    ...alwaysValidEmails,
    ...requiresSpacesSurroundedByQuote,
    ...requiresDoublePeriodsInQuotes,
    ...requiresNumbers,
    ...requiresPeriods,
    ...requiresPrintable,
    ...requiresQuotes,
    ...requiresPeriodsAndQuotes,
    ...requiresLocalHyphens,
    ...requiresDomainHyphens,
    ...requiresHyphens,
  ]

  runValidations(validations, emailValidator, true)
})

describe('Check invalid emails. | W/Out uppercase letters, and lowercasing.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    local: {
      alphaUpper: false,
    },
  })

  const emailWOAt = 'Abc.example.com'
  it(`Emails without at symbol are invalid. (${emailWOAt})`, async () =>
    expect(await emailValidator.validate(emailWOAt)).to.equal(false))
  const emailWAtFirst = '@Abc.example.com'
  it(`Emails with the at symbol at the beginning are invalid. (${emailWAtFirst})`, async () =>
    expect(await emailValidator.validate(emailWAtFirst)).to.equal(false))
  const emailWMultiAts = 'A@b@c@example.com'
  it(`Emails with multiple ats are invalid. (${emailWMultiAts})`, async () =>
    expect(await emailValidator.validate(emailWMultiAts)).to.equal(false))
  const emailWUnquotedSpecialChars = 'a"b(c)d,e:f;g<h>i[j\\k]l@example.com'
  it(`Emails with unquoted special chars are invalid. (${emailWUnquotedSpecialChars})`, async () =>
    expect(await emailValidator.validate(emailWUnquotedSpecialChars)).to.equal(
      false
    ))
  const emailWQuoteButNoDots = 'just"not"right@example.com'
  it(`Emails with quotes that are not the only thing but not seperated by dots are invalid. (${emailWQuoteButNoDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButNoDots)).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotesNoBackslash =
    'this is"notallowed@example.com'
  it(`Emails with spaces, quotes, and backslashes outside of a quotes and not proceeded by a backslash are invalid. (${emailWSpacesQuotesBackslashOutsideQuotesNoBackslash})`, async () =>
    expect(
      await emailValidator.validate(
        emailWSpacesQuotesBackslashOutsideQuotesNoBackslash
      )
    ).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotes =
    'this still"not\\allowed@example.com'
  it(`Emails with spaces, quotes, and backslashes outside of a quotes are invalid. (${emailWSpacesQuotesBackslashOutsideQuotes})`, async () =>
    expect(
      await emailValidator.validate(emailWSpacesQuotesBackslashOutsideQuotes)
    ).to.equal(false))
  const emailWTooLongLocal =
    '1234567890123456789012345678901234567890123456789012345678901234+x@example.com'
  it(`Emails with more than 64 chars are invalid. (${emailWTooLongLocal})`, async () =>
    expect(await emailValidator.validate(emailWTooLongLocal)).to.equal(false))
  const emailWUnderscoredDomain =
    'i_like_underscore@but_its_not_allowed_in_this_part.example.com'
  it(`Emails with underscores in the domain are invalid. (${emailWUnderscoredDomain})`, async () =>
    expect(await emailValidator.validate(emailWUnderscoredDomain)).to.equal(
      false
    ))
  const emailWIconCharacters = 'QA☕CHOCOLATE☕@test.com'
  it(`Emails with icon characters invalid. (${emailWIconCharacters})`, async () =>
    expect(await emailValidator.validate(emailWIconCharacters)).to.equal(false))
  const emailWODomainPeriod = 'james@google'
  it(`Emails without a period in the domain are invalid. (${emailWODomainPeriod})`, async () =>
    expect(await emailValidator.validate(emailWODomainPeriod)).to.equal(false))
  const emailWPeriodNearEnd = 'james@google.c'
  it(`Emails with periods that are less than 2 chars from the end of the domain are invalid. (${emailWPeriodNearEnd})`, async () =>
    expect(await emailValidator.validate(emailWPeriodNearEnd)).to.equal(false))
  const emailWPeriodNearBeginning = 'james@g.com'
  it(`Emails with periods that are less than 1 chars from the domain beginning are invalid. (${emailWPeriodNearBeginning})`, async () =>
    expect(await emailValidator.validate(emailWPeriodNearBeginning)).to.equal(
      false
    ))
  const emailWSpaceButNoQuotes = 'james richards@google.com'
  it(`Emails with spaces but no quotes are invalid. (${emailWSpaceButNoQuotes})`, async () =>
    expect(await emailValidator.validate(emailWSpaceButNoQuotes)).to.equal(
      false
    ))
  const emailWSpaceButOnlyQuoteBefore = 'james" richards@google.com'
  it(`Emails with spaces but only a quote before or after are invlaid. (${emailWSpaceButOnlyQuoteBefore})`, async () =>
    expect(
      await emailValidator.validate(emailWSpaceButOnlyQuoteBefore)
    ).to.equal(false))
  const emailWInvalidDomainChars = 'james@cb$.com'
  it(`Emails with invalid chars in the domain are invalid. (${emailWInvalidDomainChars})`, async () =>
    expect(await emailValidator.validate(emailWInvalidDomainChars)).to.equal(
      false
    ))
  const emailWQuoteButMissingDots = 'just."not"right@example.com'
  it(`Emails with quotes that are not the only thing but are missing some of the dots that should surround quotes are invalid. (${emailWQuoteButMissingDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButMissingDots)).to.equal(
      false
    ))
  const doubleDotBeforeAt = 'john..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAt})`, async () =>
    expect(await emailValidator.validate(doubleDotBeforeAt)).to.equal(false))

  const doubleDotBeforeAtAndOneQuote = '"john..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndOneQuote})`, async () =>
    expect(
      await emailValidator.validate(doubleDotBeforeAtAndOneQuote)
    ).to.equal(false))
  const doubleDotBeforeAtAndTwoQuotesBeforePeriods = '"john"..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndTwoQuotesBeforePeriods})`, async () =>
    expect(
      await emailValidator.validate(doubleDotBeforeAtAndTwoQuotesBeforePeriods)
    ).to.equal(false))
  const doubleDotAfterAt = 'john.doe@example..com'
  it(`Emails with 2 dots together after the at are invalid. (${doubleDotAfterAt})`, async () =>
    expect(await emailValidator.validate(doubleDotAfterAt)).to.equal(false))

  const uppercasedEmail = 'tesT@example.com'
  it(`Emails with uppercase letters when sanitize.lowercase is false and local.alphaUpper is false are invalid. (${uppercasedEmail})`, async () =>
    expect(await emailValidator.validate(uppercasedEmail)).to.equal(false))

  const emailWInternalQuoteWDots = 'just."not."right@example.com'
  it(`Emails with quotes that have periods next to them but are not onside are invalid. (${emailWInternalQuoteWDots})`, async () =>
    expect(await emailValidator.validate(emailWInternalQuoteWDots)).to.equal(
      false
    ))

  const emailInvalidTld = 'test@example.thisisnotavalidtld'
  it(`Emails that are non-icann tlds invalid. (${emailInvalidTld})`, async () =>
    expect(await emailValidator.validate(emailInvalidTld)).to.equal(false))

  const percentEscapedMailRoute = 'user%example@example.org'
  it(`Emails with % escaped mail routes that are localhost are invalid. (${percentEscapedMailRoute})`, async () =>
    expect(await emailValidator.validate(percentEscapedMailRoute)).to.equal(
      false
    ))

  const emailWTLD = 'admin@mailserver1'
  it(`Localhost domains are invalid. (${emailWTLD})`, async () =>
    expect(await emailValidator.validate(emailWTLD)).to.equal(false))
})

describe('Check valid emails. | W/Out lowercase letters.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    local: {
      alphaLower: false,
    },
  })

  const validations = [
    ...alwaysValidEmails,
    ...requiresSpacesSurroundedByQuote,
    ...requiresDoublePeriodsInQuotes,
    ...requiresUppercaseLetters,
    ...requiresNumbers,
    ...requiresPeriods,
    ...requiresPrintable,
    ...requiresQuotes,
    ...requiresPeriodsAndQuotes,
    ...requiresLocalHyphens,
    ...requiresDomainHyphens,
    ...requiresHyphens,
  ]

  runValidations(
    validations.map((validation) => ({
      ...validation,
      email: validation.email.toUpperCase(),
    })),
    emailValidator,
    true
  )
})

describe('Check invalid emails. | W/Out lowercase letters.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    local: {
      alphaLower: false,
    },
    sanitize: {
      lowercase: false,
    },
  })

  const emailWOAt = 'Abc.example.com'.toUpperCase()
  it(`Emails without at symbol are invalid. (${emailWOAt})`, async () =>
    expect(await emailValidator.validate(emailWOAt)).to.equal(false))
  const emailWAtFirst = '@Abc.example.com'.toUpperCase()
  it(`Emails with the at symbol at the beginning are invalid. (${emailWAtFirst})`, async () =>
    expect(await emailValidator.validate(emailWAtFirst)).to.equal(false))
  const emailWMultiAts = 'A@b@c@example.com'.toUpperCase()
  it(`Emails with multiple ats are invalid. (${emailWMultiAts})`, async () =>
    expect(await emailValidator.validate(emailWMultiAts)).to.equal(false))
  const emailWUnquotedSpecialChars =
    'a"b(c)d,e:f;g<h>i[j\\k]l@example.com'.toUpperCase()
  it(`Emails with unquoted special chars are invalid. (${emailWUnquotedSpecialChars})`, async () =>
    expect(await emailValidator.validate(emailWUnquotedSpecialChars)).to.equal(
      false
    ))
  const emailWQuoteButNoDots = 'just"not"right@example.com'.toUpperCase()
  it(`Emails with quotes that are not the only thing but not seperated by dots are invalid. (${emailWQuoteButNoDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButNoDots)).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotesNoBackslash =
    'this is"notallowed@example.com'.toUpperCase()
  it(`Emails with spaces, quotes, and backslashes outside of a quotes and not proceeded by a backslash are invalid. (${emailWSpacesQuotesBackslashOutsideQuotesNoBackslash})`, async () =>
    expect(
      await emailValidator.validate(
        emailWSpacesQuotesBackslashOutsideQuotesNoBackslash
      )
    ).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotes =
    'this still"not\\allowed@example.com'.toUpperCase()
  it(`Emails with spaces, quotes, and backslashes outside of a quotes are invalid. (${emailWSpacesQuotesBackslashOutsideQuotes})`, async () =>
    expect(
      await emailValidator.validate(emailWSpacesQuotesBackslashOutsideQuotes)
    ).to.equal(false))
  const emailWTooLongLocal =
    '1234567890123456789012345678901234567890123456789012345678901234+x@example.com'.toUpperCase()
  it(`Emails with more than 64 chars are invalid. (${emailWTooLongLocal})`, async () =>
    expect(await emailValidator.validate(emailWTooLongLocal)).to.equal(false))
  const emailWUnderscoredDomain =
    'i_like_underscore@but_its_not_allowed_in_this_part.example.com'.toUpperCase()
  it(`Emails with underscores in the domain are invalid. (${emailWUnderscoredDomain})`, async () =>
    expect(await emailValidator.validate(emailWUnderscoredDomain)).to.equal(
      false
    ))
  const emailWIconCharacters = 'QA☕CHOCOLATE☕@test.com'.toUpperCase()
  it(`Emails with icon characters invalid. (${emailWIconCharacters})`, async () =>
    expect(await emailValidator.validate(emailWIconCharacters)).to.equal(false))
  const emailWODomainPeriod = 'james@google'.toUpperCase()
  it(`Emails without a period in the domain are invalid. (${emailWODomainPeriod})`, async () =>
    expect(await emailValidator.validate(emailWODomainPeriod)).to.equal(false))
  const emailWPeriodNearEnd = 'james@google.c'
  it(`Emails with periods that are less than 2 chars from the end of the domain are invalid. (${emailWPeriodNearEnd})`, async () =>
    expect(await emailValidator.validate(emailWPeriodNearEnd)).to.equal(false))
  const emailWPeriodNearBeginning = 'james@g.com'
  it(`Emails with periods that are less than 1 chars from the domain beginning are invalid. (${emailWPeriodNearBeginning})`, async () =>
    expect(await emailValidator.validate(emailWPeriodNearBeginning)).to.equal(
      false
    ))
  const emailWSpaceButNoQuotes = 'james richards@google.com'.toUpperCase()
  it(`Emails with spaces but no quotes are invalid. (${emailWSpaceButNoQuotes})`, async () =>
    expect(await emailValidator.validate(emailWSpaceButNoQuotes)).to.equal(
      false
    ))
  const emailWSpaceButOnlyQuoteBefore =
    'james" richards@google.com'.toUpperCase()
  it(`Emails with spaces but only a quote before or after are invlaid. (${emailWSpaceButOnlyQuoteBefore})`, async () =>
    expect(
      await emailValidator.validate(emailWSpaceButOnlyQuoteBefore)
    ).to.equal(false))
  const emailWInvalidDomainChars = 'james@cb$.com'.toUpperCase()
  it(`Emails with invalid chars in the domain are invalid. (${emailWInvalidDomainChars})`, async () =>
    expect(await emailValidator.validate(emailWInvalidDomainChars)).to.equal(
      false
    ))
  const emailWQuoteButMissingDots = 'just."not"right@example.com'.toUpperCase()
  it(`Emails with quotes that are not the only thing but are missing some of the dots that should surround quotes are invalid. (${emailWQuoteButMissingDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButMissingDots)).to.equal(
      false
    ))
  const doubleDotBeforeAt = 'john..doe@example.com'.toUpperCase()
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAt})`, async () =>
    expect(await emailValidator.validate(doubleDotBeforeAt)).to.equal(false))

  const doubleDotBeforeAtAndOneQuote = '"john..doe@example.com'.toUpperCase()
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndOneQuote})`, async () =>
    expect(
      await emailValidator.validate(doubleDotBeforeAtAndOneQuote)
    ).to.equal(false))
  const doubleDotBeforeAtAndTwoQuotesBeforePeriods =
    '"john"..doe@example.com'.toUpperCase()
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndTwoQuotesBeforePeriods})`, async () =>
    expect(
      await emailValidator.validate(doubleDotBeforeAtAndTwoQuotesBeforePeriods)
    ).to.equal(false))
  const doubleDotAfterAt = 'john.doe@example..com'.toUpperCase()
  it(`Emails with 2 dots together after the at are invalid. (${doubleDotAfterAt})`, async () =>
    expect(await emailValidator.validate(doubleDotAfterAt)).to.equal(false))

  const emailWInternalQuoteWDots = 'just."not."right@example.com'.toUpperCase()
  it(`Emails with quotes that have periods next to them but are not onside are invalid. (${emailWInternalQuoteWDots})`, async () =>
    expect(await emailValidator.validate(emailWInternalQuoteWDots)).to.equal(
      false
    ))

  const emailInvalidTld = 'test@example.thisisnotavalidtld'
  it(`Emails that are non-icann tlds invalid. (${emailInvalidTld})`, async () =>
    expect(await emailValidator.validate(emailInvalidTld)).to.equal(false))

  const percentEscapedMailRoute = 'user%example@example.org'
  it(`Emails with % escaped mail routes that are localhost are invalid. (${percentEscapedMailRoute})`, async () =>
    expect(await emailValidator.validate(percentEscapedMailRoute)).to.equal(
      false
    ))

  const emailWTLD = 'admin@mailserver1'
  it(`Localhost domains are invalid. (${emailWTLD})`, async () =>
    expect(await emailValidator.validate(emailWTLD)).to.equal(false))
})

describe('Check valid emails. | W/Out numbers.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    local: {
      numeric: false,
    },
  })

  const validations = [
    ...alwaysValidEmails,
    ...requiresSpacesSurroundedByQuote,
    ...requiresDoublePeriodsInQuotes,
    ...requiresUppercaseLetters,
    ...requiresPeriods,
    ...requiresPrintable,
    ...requiresQuotes,
    ...requiresPeriodsAndQuotes,
    ...requiresLocalHyphens,
    ...requiresDomainHyphens,
    ...requiresHyphens,
  ]

  runValidations(validations, emailValidator, true)
})

describe('Check invalid emails. | W/Out numbers.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    local: {
      numeric: false,
    },
  })

  const emailWNumbers = 'simple1@example.com'
  it(`Valid emails with numbers are invalid. (${emailWNumbers})`, async () =>
    expect(await emailValidator.validate(emailWNumbers)).to.equal(false))
  const emailWOAt = 'Abc.example.com'
  it(`Emails without at symbol are invalid. (${emailWOAt})`, async () =>
    expect(await emailValidator.validate(emailWOAt)).to.equal(false))
  const emailWAtFirst = '@Abc.example.com'
  it(`Emails with the at symbol at the beginning are invalid. (${emailWAtFirst})`, async () =>
    expect(await emailValidator.validate(emailWAtFirst)).to.equal(false))
  const emailWMultiAts = 'A@b@c@example.com'
  it(`Emails with multiple ats are invalid. (${emailWMultiAts})`, async () =>
    expect(await emailValidator.validate(emailWMultiAts)).to.equal(false))
  const emailWUnquotedSpecialChars = 'a"b(c)d,e:f;g<h>i[j\\k]l@example.com'
  it(`Emails with unquoted special chars are invalid. (${emailWUnquotedSpecialChars})`, async () =>
    expect(await emailValidator.validate(emailWUnquotedSpecialChars)).to.equal(
      false
    ))
  const emailWQuoteButNoDots = 'just"not"right@example.com'
  it(`Emails with quotes that are not the only thing but not seperated by dots are invalid. (${emailWQuoteButNoDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButNoDots)).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotesNoBackslash =
    'this is"notallowed@example.com'
  it(`Emails with spaces, quotes, and backslashes outside of a quotes and not proceeded by a backslash are invalid. (${emailWSpacesQuotesBackslashOutsideQuotesNoBackslash})`, async () =>
    expect(
      await emailValidator.validate(
        emailWSpacesQuotesBackslashOutsideQuotesNoBackslash
      )
    ).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotes =
    'this still"not\\allowed@example.com'
  it(`Emails with spaces, quotes, and backslashes outside of a quotes are invalid. (${emailWSpacesQuotesBackslashOutsideQuotes})`, async () =>
    expect(
      await emailValidator.validate(emailWSpacesQuotesBackslashOutsideQuotes)
    ).to.equal(false))
  const emailWTooLongLocal =
    'uayuYfBgRktoqVPCAJLhkcyVHFsZygReesttpNWTTiETtbQFfDUMZjyCdeaEhcotf+x@example.com'
  it(`Emails with more than 64 chars are invalid. (${emailWTooLongLocal})`, async () =>
    expect(await emailValidator.validate(emailWTooLongLocal)).to.equal(false))
  const emailWUnderscoredDomain =
    'i_like_underscore@but_its_not_allowed_in_this_part.example.com'
  it(`Emails with underscores in the domain are invalid. (${emailWUnderscoredDomain})`, async () =>
    expect(await emailValidator.validate(emailWUnderscoredDomain)).to.equal(
      false
    ))
  const emailWIconCharacters = 'QA☕CHOCOLATE☕@test.com'
  it(`Emails with icon characters invalid. (${emailWIconCharacters})`, async () =>
    expect(await emailValidator.validate(emailWIconCharacters)).to.equal(false))
  const emailWODomainPeriod = 'james@google'
  it(`Emails without a period in the domain are invalid. (${emailWODomainPeriod})`, async () =>
    expect(await emailValidator.validate(emailWODomainPeriod)).to.equal(false))
  const emailWPeriodNearEnd = 'james@google.c'
  it(`Emails with periods that are less than 2 chars from the end of the domain are invalid. (${emailWPeriodNearEnd})`, async () =>
    expect(await emailValidator.validate(emailWPeriodNearEnd)).to.equal(false))
  const emailWPeriodNearBeginning = 'james@g.com'
  it(`Emails with periods that are less than 1 chars from the domain beginning are invalid. (${emailWPeriodNearBeginning})`, async () =>
    expect(await emailValidator.validate(emailWPeriodNearBeginning)).to.equal(
      false
    ))
  const emailWSpaceButNoQuotes = 'james richards@google.com'
  it(`Emails with spaces but no quotes are invalid. (${emailWSpaceButNoQuotes})`, async () =>
    expect(await emailValidator.validate(emailWSpaceButNoQuotes)).to.equal(
      false
    ))
  const emailWSpaceButOnlyQuoteBefore = 'james" richards@google.com'
  it(`Emails with spaces but only a quote before or after are invlaid. (${emailWSpaceButOnlyQuoteBefore})`, async () =>
    expect(
      await emailValidator.validate(emailWSpaceButOnlyQuoteBefore)
    ).to.equal(false))
  const emailWInvalidDomainChars = 'james@cb$.com'
  it(`Emails with invalid chars in the domain are invalid. (${emailWInvalidDomainChars})`, async () =>
    expect(await emailValidator.validate(emailWInvalidDomainChars)).to.equal(
      false
    ))
  const emailWQuoteButMissingDots = 'just."not"right@example.com'
  it(`Emails with quotes that are not the only thing but are missing some of the dots that should surround quotes are invalid. (${emailWQuoteButMissingDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButMissingDots)).to.equal(
      false
    ))
  const doubleDotBeforeAt = 'john..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAt})`, async () =>
    expect(await emailValidator.validate(doubleDotBeforeAt)).to.equal(false))

  const doubleDotBeforeAtAndOneQuote = '"john..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndOneQuote})`, async () =>
    expect(
      await emailValidator.validate(doubleDotBeforeAtAndOneQuote)
    ).to.equal(false))
  const doubleDotBeforeAtAndTwoQuotesBeforePeriods = '"john"..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndTwoQuotesBeforePeriods})`, async () =>
    expect(
      await emailValidator.validate(doubleDotBeforeAtAndTwoQuotesBeforePeriods)
    ).to.equal(false))
  const doubleDotAfterAt = 'john.doe@example..com'
  it(`Emails with 2 dots together after the at are invalid. (${doubleDotAfterAt})`, async () =>
    expect(await emailValidator.validate(doubleDotAfterAt)).to.equal(false))

  const emailWInternalQuoteWDots = 'just."not."right@example.com'
  it(`Emails with quotes that have periods next to them but are not onside are invalid. (${emailWInternalQuoteWDots})`, async () =>
    expect(await emailValidator.validate(emailWInternalQuoteWDots)).to.equal(
      false
    ))

  const emailInvalidTld = 'test@example.thisisnotavalidtld'
  it(`Emails that are non-icann tlds invalid. (${emailInvalidTld})`, async () =>
    expect(await emailValidator.validate(emailInvalidTld)).to.equal(false))

  const percentEscapedMailRoute = 'user%example@example.org'
  it(`Emails with % escaped mail routes that are localhost are invalid. (${percentEscapedMailRoute})`, async () =>
    expect(await emailValidator.validate(percentEscapedMailRoute)).to.equal(
      false
    ))

  const emailWTLD = 'admin@mailserver1'
  it(`Localhost domains are invalid. (${emailWTLD})`, async () =>
    expect(await emailValidator.validate(emailWTLD)).to.equal(false))
})

describe('Check valid emails. | W/Out periods.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    local: {
      period: false,
    },
  })

  const validations = [
    ...alwaysValidEmails,
    ...requiresSpacesSurroundedByQuote,
    ...requiresUppercaseLetters,
    ...requiresNumbers,
    ...requiresPrintable,
    ...requiresQuotes,
    ...requiresLocalHyphens,
    ...requiresDomainHyphens,
    ...requiresHyphens,
  ]

  runValidations(validations, emailValidator, true)
})

describe('Check invalid emails. | W/Out periods.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    local: {
      period: false,
      doublePeriodsInQuotes: false,
    },
  })

  const periodEmail = 'very.common@example.com'
  it(`Emails with periods are invalid. (${periodEmail})`, async () =>
    expect(await emailValidator.validate(periodEmail)).to.equal(false))
  const emailWOAt = 'Abc+example.com'
  it(`Emails without at symbol are invalid. (${emailWOAt})`, async () =>
    expect(await emailValidator.validate(emailWOAt)).to.equal(false))
  const emailWAtFirst = '@Abc.example.com'
  it(`Emails with the at symbol at the beginning are invalid. (${emailWAtFirst})`, async () =>
    expect(await emailValidator.validate(emailWAtFirst)).to.equal(false))
  const emailWMultiAts = 'A@b@c@example.com'
  it(`Emails with multiple ats are invalid. (${emailWMultiAts})`, async () =>
    expect(await emailValidator.validate(emailWMultiAts)).to.equal(false))
  const emailWUnquotedSpecialChars = 'a"b(c)d,e:f;g<h>i[j\\k]l@example.com'
  it(`Emails with unquoted special chars are invalid. (${emailWUnquotedSpecialChars})`, async () =>
    expect(await emailValidator.validate(emailWUnquotedSpecialChars)).to.equal(
      false
    ))
  const emailWQuoteButNoDots = 'just"not"right@example.com'
  it(`Emails with quotes that are not the only thing but not seperated by dots are invalid. (${emailWQuoteButNoDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButNoDots)).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotesNoBackslash =
    'this is"notallowed@example.com'
  it(`Emails with spaces, quotes, and backslashes outside of a quotes and not proceeded by a backslash are invalid. (${emailWSpacesQuotesBackslashOutsideQuotesNoBackslash})`, async () =>
    expect(
      await emailValidator.validate(
        emailWSpacesQuotesBackslashOutsideQuotesNoBackslash
      )
    ).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotes =
    'this still"not\\allowed@example.com'
  it(`Emails with spaces, quotes, and backslashes outside of a quotes are invalid. (${emailWSpacesQuotesBackslashOutsideQuotes})`, async () =>
    expect(
      await emailValidator.validate(emailWSpacesQuotesBackslashOutsideQuotes)
    ).to.equal(false))
  const emailWTooLongLocal =
    '1234567890123456789012345678901234567890123456789012345678901234+x@example.com'
  it(`Emails with more than 64 chars are invalid. (${emailWTooLongLocal})`, async () =>
    expect(await emailValidator.validate(emailWTooLongLocal)).to.equal(false))
  const emailWUnderscoredDomain =
    'i_like_underscore@but_its_not_allowed_in_this_part.example.com'
  it(`Emails with underscores in the domain are invalid. (${emailWUnderscoredDomain})`, async () =>
    expect(await emailValidator.validate(emailWUnderscoredDomain)).to.equal(
      false
    ))
  const emailWIconCharacters = 'QA☕CHOCOLATE☕@test.com'
  it(`Emails with icon characters invalid. (${emailWIconCharacters})`, async () =>
    expect(await emailValidator.validate(emailWIconCharacters)).to.equal(false))
  const emailWODomainPeriod = 'james@google'
  it(`Emails without a period in the domain are invalid. (${emailWODomainPeriod})`, async () =>
    expect(await emailValidator.validate(emailWODomainPeriod)).to.equal(false))
  const emailWPeriodNearEnd = 'james@google.c'
  it(`Emails with periods that are less than 2 chars from the end of the domain are invalid. (${emailWPeriodNearEnd})`, async () =>
    expect(await emailValidator.validate(emailWPeriodNearEnd)).to.equal(false))
  const emailWPeriodNearBeginning = 'james@g.com'
  it(`Emails with periods that are less than 1 chars from the domain beginning are invalid. (${emailWPeriodNearBeginning})`, async () =>
    expect(await emailValidator.validate(emailWPeriodNearBeginning)).to.equal(
      false
    ))
  const emailWSpaceButNoQuotes = 'james richards@google.com'
  it(`Emails with spaces but no quotes are invalid. (${emailWSpaceButNoQuotes})`, async () =>
    expect(await emailValidator.validate(emailWSpaceButNoQuotes)).to.equal(
      false
    ))
  const emailWSpaceButOnlyQuoteBefore = 'james" richards@google.com'
  it(`Emails with spaces but only a quote before or after are invlaid. (${emailWSpaceButOnlyQuoteBefore})`, async () =>
    expect(
      await emailValidator.validate(emailWSpaceButOnlyQuoteBefore)
    ).to.equal(false))
  const emailWInvalidDomainChars = 'james@cb$.com'
  it(`Emails with invalid chars in the domain are invalid. (${emailWInvalidDomainChars})`, async () =>
    expect(await emailValidator.validate(emailWInvalidDomainChars)).to.equal(
      false
    ))

  const emailWInternalQuoteWDots = 'just."not."right@example.com'
  it(`Emails with quotes that have periods next to them but are not onside are invalid. (${emailWInternalQuoteWDots})`, async () =>
    expect(await emailValidator.validate(emailWInternalQuoteWDots)).to.equal(
      false
    ))

  const emailInvalidTld = 'test@example.thisisnotavalidtld'
  it(`Emails that are non-icann tlds invalid. (${emailInvalidTld})`, async () =>
    expect(await emailValidator.validate(emailInvalidTld)).to.equal(false))

  const percentEscapedMailRoute = 'user%example@example.org'
  it(`Emails with % escaped mail routes that are localhost are invalid. (${percentEscapedMailRoute})`, async () =>
    expect(await emailValidator.validate(percentEscapedMailRoute)).to.equal(
      false
    ))

  const emailWTLD = 'admin@mailserver1'
  it(`Localhost domains are invalid. (${emailWTLD})`, async () =>
    expect(await emailValidator.validate(emailWTLD)).to.equal(false))
})

describe('Check valid emails. | W/Out printable chars.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    local: {
      printable: false,
    },
  })

  const validations = [
    ...alwaysValidEmails,
    ...requiresSpacesSurroundedByQuote,
    ...requiresDoublePeriodsInQuotes,
    ...requiresUppercaseLetters,
    ...requiresNumbers,
    ...requiresPeriods,
    ...requiresQuotes,
    ...requiresPeriodsAndQuotes,
    ...requiresLocalHyphens,
    ...requiresDomainHyphens,
    ...requiresHyphens,
  ]

  runValidations(validations, emailValidator, true)
})

describe('Check valid emails. | W/Out quotes.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    local: {
      quote: false,
    },
  })

  const validations = [
    ...alwaysValidEmails,
    ...requiresUppercaseLetters,
    ...requiresNumbers,
    ...requiresPeriods,
    ...requiresPrintable,
    ...requiresLocalHyphens,
    ...requiresDomainHyphens,
    ...requiresHyphens,
  ]

  runValidations(validations, emailValidator, true)
})

describe('Check valid emails. | W/Out hyphens in local.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    local: {
      hyphen: false,
    },
  })

  const validations = [
    ...alwaysValidEmails,
    ...requiresSpacesSurroundedByQuote,
    ...requiresDoublePeriodsInQuotes,
    ...requiresUppercaseLetters,
    ...requiresNumbers,
    ...requiresPeriods,
    ...requiresPrintable,
    ...requiresQuotes,
    ...requiresPeriodsAndQuotes,
    ...requiresDomainHyphens,
  ]

  runValidations(validations, emailValidator, true)
})

describe('Check valid emails. | W/Out hyphens in domain.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    domain: {
      hyphen: false,
    },
  })

  const validations = [
    ...alwaysValidEmails,
    ...requiresSpacesSurroundedByQuote,
    ...requiresDoublePeriodsInQuotes,
    ...requiresUppercaseLetters,
    ...requiresNumbers,
    ...requiresPeriods,
    ...requiresPrintable,
    ...requiresQuotes,
    ...requiresPeriodsAndQuotes,
    ...requiresLocalHyphens,
  ]

  runValidations(validations, emailValidator, true)
})

// describe('Check invalid emails. | W/Out printable chars, spaces, quotes, or hyphens in domain.', async () => {
//   const emailValidator = new EmailSyntaxValidator({
//     local: {
//       printable: false,
//       // space: false,
//       // quote: false,
//     },
//     // domain: {
//     //   hyphen: false,
//     // },
//   })

//   const emailWOAt = 'Abc.example.com'
//   it(`Emails without at symbol are invalid. (${emailWOAt})`, async () =>
//     expect(await emailValidator.validate(emailWOAt)).to.equal(false))
//   const emailWAtFirst = '@Abc.example.com'
//   it(`Emails with the at symbol at the beginning are invalid. (${emailWAtFirst})`, async () =>
//     expect(await emailValidator.validate(emailWAtFirst)).to.equal(false))
//   const emailWMultiAts = 'A@b@c@example.com'
//   it(`Emails with multiple ats are invalid. (${emailWMultiAts})`, async () =>
//     expect(await emailValidator.validate(emailWMultiAts)).to.equal(false))
//   const emailWUnquotedSpecialChars = 'a"b(c)d,e:f;g<h>i[j\\k]l@example.com'
//   it(`Emails with unquoted special chars are invalid. (${emailWUnquotedSpecialChars})`, async () =>
//     expect(await emailValidator.validate(emailWUnquotedSpecialChars)).to.equal(
//       false
//     ))
//   const emailWQuoteButNoDots = 'just"not"right@example.com'
//   it(`Emails with quotes that are not the only thing but not seperated by dots are invalid. (${emailWQuoteButNoDots})`, async () =>
//     expect(await emailValidator.validate(emailWQuoteButNoDots)).to.equal(false))
//   const emailWSpacesQuotesBackslashOutsideQuotesNoBackslash =
//     'this is"notallowed@example.com'
//   it(`Emails with spaces, quotes, and backslashes outside of a quotes and not proceeded by a backslash are invalid. (${emailWSpacesQuotesBackslashOutsideQuotesNoBackslash})`, async () =>
//     expect(
//       await emailValidator.validate(
//         emailWSpacesQuotesBackslashOutsideQuotesNoBackslash
//       )
//     ).to.equal(false))
//   const emailWSpacesQuotesBackslashOutsideQuotes =
//     'this still"not\\allowed@example.com'
//   it(`Emails with spaces, quotes, and backslashes outside of a quotes are invalid. (${emailWSpacesQuotesBackslashOutsideQuotes})`, async () =>
//     expect(
//       await emailValidator.validate(emailWSpacesQuotesBackslashOutsideQuotes)
//     ).to.equal(false))
//   const emailWTooLongLocal =
//     '1234567890123456789012345678901234567890123456789012345678901234+x@example.com'
//   it(`Emails with more than 64 chars are invalid. (${emailWTooLongLocal})`, async () =>
//     expect(await emailValidator.validate(emailWTooLongLocal)).to.equal(false))
//   const emailWUnderscoredDomain =
//     'i_like_underscore@but_its_not_allowed_in_this_part.example.com'
//   it(`Emails with underscores in the domain are invalid. (${emailWUnderscoredDomain})`, async () =>
//     expect(await emailValidator.validate(emailWUnderscoredDomain)).to.equal(
//       false
//     ))
//   const emailWIconCharacters = 'QA☕CHOCOLATE☕@test.com'
//   it(`Emails with icon characters invalid. (${emailWIconCharacters})`, async () =>
//     expect(await emailValidator.validate(emailWIconCharacters)).to.equal(false))
//   const emailWODomainPeriod = 'james@google'
//   it(`Emails without a period in the domain are invalid. (${emailWODomainPeriod})`, async () =>
//     expect(await emailValidator.validate(emailWODomainPeriod)).to.equal(false))
//   const emailWPeriodNearEnd = 'james@google.c'
//   it(`Emails with periods that are less than 2 chars from the end of the domain are invalid. (${emailWPeriodNearEnd})`, async () =>
//     expect(await emailValidator.validate(emailWPeriodNearEnd)).to.equal(false))
//   const emailWPeriodNearBeginning = 'james@g.com'
//   it(`Emails with periods that are less than 1 chars from the domain beginning are invalid. (${emailWPeriodNearBeginning})`, async () =>
//     expect(await emailValidator.validate(emailWPeriodNearBeginning)).to.equal(
//       false
//     ))
//   const emailWSpaceButNoQuotes = 'james richards@google.com'
//   it(`Emails with spaces but no quotes are invalid. (${emailWSpaceButNoQuotes})`, async () =>
//     expect(await emailValidator.validate(emailWSpaceButNoQuotes)).to.equal(
//       false
//     ))
//   const emailWSpaceButOnlyQuoteBefore = 'james" richards@google.com'
//   it(`Emails with spaces but only a quote before or after are invlaid. (${emailWSpaceButOnlyQuoteBefore})`, async () =>
//     expect(
//       await emailValidator.validate(emailWSpaceButOnlyQuoteBefore)
//     ).to.equal(false))
//   const emailWInvalidDomainChars = 'james@cb$.com'
//   it(`Emails with invalid chars in the domain are invalid. (${emailWInvalidDomainChars})`, async () =>
//     expect(await emailValidator.validate(emailWInvalidDomainChars)).to.equal(
//       false
//     ))
//   const emailWQuoteButMissingDots = 'just."not"right@example.com'
//   it(`Emails with quotes that are not the only thing but are missing some of the dots that should surround quotes are invalid. (${emailWQuoteButMissingDots})`, async () =>
//     expect(await emailValidator.validate(emailWQuoteButMissingDots)).to.equal(
//       false
//     ))
//   const doubleDotBeforeAt = 'john..doe@example.com'
//   it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAt})`, async () =>
//     expect(await emailValidator.validate(doubleDotBeforeAt)).to.equal(false))

//   const doubleDotBeforeAtAndOneQuote = '"john..doe@example.com'
//   it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndOneQuote})`, async () =>
//     expect(
//       await emailValidator.validate(doubleDotBeforeAtAndOneQuote)
//     ).to.equal(false))
//   const doubleDotBeforeAtAndTwoQuotesBeforePeriods = '"john"..doe@example.com'
//   it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndTwoQuotesBeforePeriods})`, async () =>
//     expect(
//       await emailValidator.validate(doubleDotBeforeAtAndTwoQuotesBeforePeriods)
//     ).to.equal(false))
//   const doubleDotAfterAt = 'john.doe@example..com'
//   it(`Emails with 2 dots together after the at are invalid. (${doubleDotAfterAt})`, async () =>
//     expect(await emailValidator.validate(doubleDotAfterAt)).to.equal(false))
//   const emailWInternalQuoteWDots = 'just."not."right@example.com'
//   it(`Emails with quotes that have periods next to them but are not onside are invalid. (${emailWInternalQuoteWDots})`, async () =>
//     expect(await emailValidator.validate(emailWInternalQuoteWDots)).to.equal(
//       false
//     ))

//   const emailInvalidTld = 'test@example.thisisnotavalidtld'
//   it(`Emails that are non-icann tlds invalid. (${emailInvalidTld})`, async () =>
//     expect(await emailValidator.validate(emailInvalidTld)).to.equal(false))

//   const percentEscapedMailRouteLocalhost = 'user%example@example.org'
//   it(`Emails with % escaped mail routes that are localhost are invalid. (${percentEscapedMailRouteLocalhost})`, async () =>
//     expect(
//       await emailValidator.validate(percentEscapedMailRouteLocalhost)
//     ).to.equal(false))

//   const localEndingInNonAlphaNum = 'user-@example.org'
//   it(`Emails that end in non-alphanumeric characters are invalid. (${localEndingInNonAlphaNum})`, async () =>
//     expect(await emailValidator.validate(localEndingInNonAlphaNum)).to.equal(
//       false
//     ))

//   const percentEscapedMailRoute = 'user%example.com@example.org'
//   it(`Emails with % escaped mail routes are invalid. (${percentEscapedMailRoute})`, async () =>
//     expect(await emailValidator.validate(percentEscapedMailRoute)).to.equal(
//       false
//     ))

//   const bangifiedHostRoute = 'mailhost.com!username@example.org'
//   it(`Emails with bangified host routes are invalid. (${bangifiedHostRoute})`, async () =>
//     expect(await emailValidator.validate(bangifiedHostRoute)).to.equal(false))

//   const emailWInternalQuoteWDotsAround = 'just."not".right@example.com'
//   it(`Emails with quotes that are surrounded by periods are invalid. (${emailWInternalQuoteWDotsAround})`, async () =>
//     expect(
//       await emailValidator.validate(emailWInternalQuoteWDotsAround)
//     ).to.equal(false))

//   const emailWSpaceBetweenQuotes = '" "@example.org'
//   it(`Email with space between quotes for username are invalid. (${emailWSpaceBetweenQuotes})`, async () =>
//     expect(await emailValidator.validate(emailWSpaceBetweenQuotes)).to.equal(
//       false
//     ))

//   const doubleDotBeforeAtWQuote = '"john..doe"@example.com'
//   it(`Emails with 2 dots together in the local are invalid when in quotes. (${doubleDotBeforeAtWQuote})`, async () =>
//     expect(await emailValidator.validate(doubleDotBeforeAtWQuote)).to.equal(
//       false
//     ))

//   const emailWSymbol = 'disposable.style.email.with+symbol@example.com'
//   it(`Emails with symbols are invalid. (${emailWSymbol})`, async () =>
//     expect(await emailValidator.validate(emailWSymbol)).to.equal(false))
//   const emailWHyphen = 'other.email-with-hyphen@example.com'
//   it(`Emails with hyphens are invalid. (${emailWHyphen})`, async () =>
//     expect(await emailValidator.validate(emailWHyphen)).to.equal(false))
//   const emailWFQD = 'fully-qualified-domain@example.com'
//   it(`Emails with fully qualified domains are invalid. (${emailWFQD})`, async () =>
//     expect(await emailValidator.validate(emailWFQD)).to.equal(false))
//   const emailWTag = 'user.name+tag+sorting@example.com'
//   it(`Emails with tags and sorting are invalid. (${emailWTag})`, async () =>
//     expect(await emailValidator.validate(emailWTag)).to.equal(false))
//   const emailWHyphenDomain = 'example-indeed@strange-example.com'
//   it(`Emails with a hyphenated domain are invalid. (${emailWHyphenDomain})`, async () =>
//     expect(await emailValidator.validate(emailWHyphenDomain)).to.equal(false))

//   const emailWSlash = 'test/test@test.com'
//   it(`Emails with slashes are invalid. (${emailWSlash})`, async () =>
//     expect(await emailValidator.validate(emailWSlash)).to.equal(false))

//   const emailWTLD = 'admin@mailserver1'
//   it(`Localhost domains are invalid. (${emailWTLD})`, async () =>
//     expect(await emailValidator.validate(emailWTLD)).to.equal(false))
// })

describe('Check valid emails. | W/Out tld check.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    domain: {
      tld: false,
      // charsBeforeDot: -1,
      // charsAfterDot: -1,
    },
  })

  const validations = [
    ...alwaysValidEmails,
    ...requiresSpacesSurroundedByQuote,
    ...requiresDoublePeriodsInQuotes,
    ...requiresUppercaseLetters,
    ...requiresNumbers,
    ...requiresPeriods,
    ...requiresPrintable,
    ...requiresQuotes,
    ...requiresPeriodsAndQuotes,
    ...requiresLocalHyphens,
    ...requiresDomainHyphens,
    ...requiresHyphens,
    ...requiresNoTldCheck,
  ]

  runValidations(validations, emailValidator, true)
})

describe("Check valid emails. | W/Out length check of domain's name.", async () => {
  const emailValidator = new EmailSyntaxValidator({
    domain: {
      charsBeforeDot: -1,
    },
  })

  const validations = [
    ...alwaysValidEmails,
    ...requiresSpacesSurroundedByQuote,
    ...requiresDoublePeriodsInQuotes,
    ...requiresUppercaseLetters,
    ...requiresNumbers,
    ...requiresPeriods,
    ...requiresPrintable,
    ...requiresQuotes,
    ...requiresPeriodsAndQuotes,
    ...requiresLocalHyphens,
    ...requiresDomainHyphens,
    ...requiresHyphens,
    ...requiresNoDomainNameLengthCheck,
  ]

  runValidations(validations, emailValidator, true)
})

describe('Check valid emails. | W/Out length check of tld.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    domain: {
      tld: false,
      charsAfterDot: -1,
    },
  })

  const validations = [
    ...alwaysValidEmails,
    ...requiresSpacesSurroundedByQuote,
    ...requiresDoublePeriodsInQuotes,
    ...requiresUppercaseLetters,
    ...requiresNumbers,
    ...requiresPeriods,
    ...requiresPrintable,
    ...requiresQuotes,
    ...requiresPeriodsAndQuotes,
    ...requiresLocalHyphens,
    ...requiresDomainHyphens,
    ...requiresHyphens,
    ...requiresNoTldLengthCheck,
    ...requiresNoTldCheck,
  ]

  runValidations(validations, emailValidator, true)
})

describe('Check invalid emails. | W/Out character length of domain.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    domain: {
      tld: false,
      charsBeforeDot: -1,
      charsAfterDot: -1,
    },
  })

  const emailWOAt = 'Abc.example.com'
  it(`Emails without at symbol are invalid. (${emailWOAt})`, async () =>
    expect(await emailValidator.validate(emailWOAt)).to.equal(false))
  const emailWAtFirst = '@Abc.example.com'
  it(`Emails with the at symbol at the beginning are invalid. (${emailWAtFirst})`, async () =>
    expect(await emailValidator.validate(emailWAtFirst)).to.equal(false))
  const emailWMultiAts = 'A@b@c@example.com'
  it(`Emails with multiple ats are invalid. (${emailWMultiAts})`, async () =>
    expect(await emailValidator.validate(emailWMultiAts)).to.equal(false))
  const emailWUnquotedSpecialChars = 'a"b(c)d,e:f;g<h>i[j\\k]l@example.com'
  it(`Emails with unquoted special chars are invalid. (${emailWUnquotedSpecialChars})`, async () =>
    expect(await emailValidator.validate(emailWUnquotedSpecialChars)).to.equal(
      false
    ))
  const emailWQuoteButNoDots = 'just"not"right@example.com'
  it(`Emails with quotes that are not the only thing but not seperated by dots are invalid. (${emailWQuoteButNoDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButNoDots)).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotesNoBackslash =
    'this is"notallowed@example.com'
  it(`Emails with spaces, quotes, and backslashes outside of a quotes and not proceeded by a backslash are invalid. (${emailWSpacesQuotesBackslashOutsideQuotesNoBackslash})`, async () =>
    expect(
      await emailValidator.validate(
        emailWSpacesQuotesBackslashOutsideQuotesNoBackslash
      )
    ).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotes =
    'this still"not\\allowed@example.com'
  it(`Emails with spaces, quotes, and backslashes outside of a quotes are invalid. (${emailWSpacesQuotesBackslashOutsideQuotes})`, async () =>
    expect(
      await emailValidator.validate(emailWSpacesQuotesBackslashOutsideQuotes)
    ).to.equal(false))
  const emailWTooLongLocal =
    '1234567890123456789012345678901234567890123456789012345678901234+x@example.com'
  it(`Emails with more than 64 chars are invalid. (${emailWTooLongLocal})`, async () =>
    expect(await emailValidator.validate(emailWTooLongLocal)).to.equal(false))
  const emailWUnderscoredDomain =
    'i_like_underscore@but_its_not_allowed_in_this_part.example.com'
  it(`Emails with underscores in the domain are invalid. (${emailWUnderscoredDomain})`, async () =>
    expect(await emailValidator.validate(emailWUnderscoredDomain)).to.equal(
      false
    ))
  const emailWIconCharacters = 'QA☕CHOCOLATE☕@test.com'
  it(`Emails with icon characters invalid. (${emailWIconCharacters})`, async () =>
    expect(await emailValidator.validate(emailWIconCharacters)).to.equal(false))
  const emailWODomainPeriod = 'james@google'
  it(`Emails without a period in the domain are invalid. (${emailWODomainPeriod})`, async () =>
    expect(await emailValidator.validate(emailWODomainPeriod)).to.equal(false))
  const emailWSpaceButNoQuotes = 'james richards@google.com'
  it(`Emails with spaces but no quotes are invalid. (${emailWSpaceButNoQuotes})`, async () =>
    expect(await emailValidator.validate(emailWSpaceButNoQuotes)).to.equal(
      false
    ))
  const emailWSpaceButOnlyQuoteBefore = 'james" richards@google.com'
  it(`Emails with spaces but only a quote before or after are invlaid. (${emailWSpaceButOnlyQuoteBefore})`, async () =>
    expect(
      await emailValidator.validate(emailWSpaceButOnlyQuoteBefore)
    ).to.equal(false))
  const emailWInvalidDomainChars = 'james@cb$.com'
  it(`Emails with invalid chars in the domain are invalid. (${emailWInvalidDomainChars})`, async () =>
    expect(await emailValidator.validate(emailWInvalidDomainChars)).to.equal(
      false
    ))
  const emailWQuoteButMissingDots = 'just."not"right@example.com'
  it(`Emails with quotes that are not the only thing but are missing some of the dots that should surround quotes are invalid. (${emailWQuoteButMissingDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButMissingDots)).to.equal(
      false
    ))
  const doubleDotBeforeAt = 'john..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAt})`, async () =>
    expect(await emailValidator.validate(doubleDotBeforeAt)).to.equal(false))

  const doubleDotBeforeAtAndOneQuote = '"john..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndOneQuote})`, async () =>
    expect(
      await emailValidator.validate(doubleDotBeforeAtAndOneQuote)
    ).to.equal(false))
  const doubleDotBeforeAtAndTwoQuotesBeforePeriods = '"john"..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndTwoQuotesBeforePeriods})`, async () =>
    expect(
      await emailValidator.validate(doubleDotBeforeAtAndTwoQuotesBeforePeriods)
    ).to.equal(false))
  const doubleDotAfterAt = 'john.doe@example..com'
  it(`Emails with 2 dots together after the at are invalid. (${doubleDotAfterAt})`, async () =>
    expect(await emailValidator.validate(doubleDotAfterAt)).to.equal(false))
  const emailWInternalQuoteWDots = 'just."not."right@example.com'
  it(`Emails with quotes that have periods next to them but are not onside are invalid. (${emailWInternalQuoteWDots})`, async () =>
    expect(await emailValidator.validate(emailWInternalQuoteWDots)).to.equal(
      false
    ))

  const percentEscapedMailRouteLocalhost = 'user%example@example.org'
  it(`Emails with % escaped mail routes that are localhost are invalid. (${percentEscapedMailRouteLocalhost})`, async () =>
    expect(
      await emailValidator.validate(percentEscapedMailRouteLocalhost)
    ).to.equal(false))

  const emailWTLD = 'admin@mailserver1'
  it(`Localhost domains are invalid. (${emailWTLD})`, async () =>
    expect(await emailValidator.validate(emailWTLD)).to.equal(false))
})

describe('Check valid emails. | Localhost domains valid.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    domain: {
      localhost: true,
    },
  })

  const simpleEmail = 'simple@example.com'
  it(`Simple emails are valid. (${simpleEmail})`, async () =>
    expect(await emailValidator.validate(simpleEmail)).to.equal(true))
  const periodEmail = 'very.common@example.com'
  it(`Emails with periods are valid. (${periodEmail})`, async () =>
    expect(await emailValidator.validate(periodEmail)).to.equal(true))
  const emailWSymbol = 'disposable.style.email.with+symbol@example.com'
  it(`Emails with symbols are valid. (${emailWSymbol})`, async () =>
    expect(await emailValidator.validate(emailWSymbol)).to.equal(true))
  const emailWHyphen = 'other.email-with-hyphen@example.com'
  it(`Emails with hyphens are valid. (${emailWHyphen})`, async () =>
    expect(await emailValidator.validate(emailWHyphen)).to.equal(true))
  const emailWFQD = 'fully-qualified-domain@example.com'
  it(`Emails with fully qualified domains are valid. (${emailWFQD})`, async () =>
    expect(await emailValidator.validate(emailWFQD)).to.equal(true))
  const emailWTag = 'user.name+tag+sorting@example.com'
  it(`Emails with tags and sorting are valid. (${emailWTag})`, async () =>
    expect(await emailValidator.validate(emailWTag)).to.equal(true))
  const emailWSingleLetterLocal = 'x@example.com'
  it(`Emails with a single letter local are valid. (${emailWSingleLetterLocal})`, async () =>
    expect(await emailValidator.validate(emailWSingleLetterLocal)).to.equal(
      true
    ))
  const emailWHyphenDomain = 'example-indeed@strange-example.com'
  it(`Emails with a hyphenated domain are valid. (${emailWHyphenDomain})`, async () =>
    expect(await emailValidator.validate(emailWHyphenDomain)).to.equal(true))
  const emailWTLD = 'admin@mailserver1'
  it(`Localhost domains are valid. (${emailWTLD})`, async () =>
    expect(await emailValidator.validate(emailWTLD)).to.equal(true))

  const emailWSlash = 'test/test@test.com'
  it(`Emails with slashes are valid. (${emailWSlash})`, async () =>
    expect(await emailValidator.validate(emailWSlash)).to.equal(true))

  const emailWShortTLD = 'admin@test.co'
  it(`Email with short Top Level Domain are valid. (${emailWShortTLD})`, async () =>
    expect(await emailValidator.validate(emailWShortTLD)).to.equal(true))
  const emailWSpaceBetweenQuotes = '" "@example.org'
  it(`Email with space between quotes for username are valid. (${emailWSpaceBetweenQuotes})`, async () =>
    expect(await emailValidator.validate(emailWSpaceBetweenQuotes)).to.equal(
      true
    ))

  const doubleDotBeforeAtWQuote = '"john..doe"@example.com'
  it(`Emails with 2 dots together in the local are valid when in quotes. (${doubleDotBeforeAtWQuote})`, async () =>
    expect(await emailValidator.validate(doubleDotBeforeAtWQuote)).to.equal(
      true
    ))

  const emailWInternalQuoteWDots = 'just."not".right@example.com'
  it(`Emails with quotes that are surrounded by periods are valid. (${emailWInternalQuoteWDots})`, async () =>
    expect(await emailValidator.validate(emailWInternalQuoteWDots)).to.equal(
      true
    ))

  const bangifiedHostRoute = 'mailhost!username@example.org'
  it(`Emails with bangified host routes are valid. (${bangifiedHostRoute})`, async () =>
    expect(await emailValidator.validate(bangifiedHostRoute)).to.equal(true))

  const percentEscapedMailRoute = 'user%example.com@example.org'
  it(`Emails with % escaped mail routes are valid. (${percentEscapedMailRoute})`, async () =>
    expect(await emailValidator.validate(percentEscapedMailRoute)).to.equal(
      true
    ))

  const localEndingInNonAlphaNum = 'user-@example.org'
  it(`Emails that end in non-alphanumeric characters that are in the allowed printable characters are valid. (${localEndingInNonAlphaNum})`, async () =>
    expect(await emailValidator.validate(localEndingInNonAlphaNum)).to.equal(
      true
    ))

  const gmailEmail = 'test@gmail.com'
  it(`Gmail emails are valid. (${gmailEmail})`, async () =>
    expect(await emailValidator.validate(gmailEmail)).to.equal(true))
  const emailWODomainPeriod = 'james@google'
  it(`Emails without a period in the domain are valid. (${emailWODomainPeriod})`, async () =>
    expect(await emailValidator.validate(emailWODomainPeriod)).to.equal(true))

  const percentEscapedMailRouteLocalhost = 'user%example@example.org'
  it(`Emails with % escaped mail routes that are localhost are valid. (${percentEscapedMailRouteLocalhost})`, async () =>
    expect(
      await emailValidator.validate(percentEscapedMailRouteLocalhost)
    ).to.equal(true))
})

describe('Check invalid emails. | Localhost domains valid.', async () => {
  const emailValidator = new EmailSyntaxValidator({
    domain: {
      localhost: true,
    },
  })

  const emailWOAt = 'Abc.example.com'
  it(`Emails without at symbol are invalid. (${emailWOAt})`, async () =>
    expect(await emailValidator.validate(emailWOAt)).to.equal(false))
  const emailWAtFirst = '@Abc.example.com'
  it(`Emails with the at symbol at the beginning are invalid. (${emailWAtFirst})`, async () =>
    expect(await emailValidator.validate(emailWAtFirst)).to.equal(false))
  const emailWMultiAts = 'A@b@c@example.com'
  it(`Emails with multiple ats are invalid. (${emailWMultiAts})`, async () =>
    expect(await emailValidator.validate(emailWMultiAts)).to.equal(false))
  const emailWUnquotedSpecialChars = 'a"b(c)d,e:f;g<h>i[j\\k]l@example.com'
  it(`Emails with unquoted special chars are invalid. (${emailWUnquotedSpecialChars})`, async () =>
    expect(await emailValidator.validate(emailWUnquotedSpecialChars)).to.equal(
      false
    ))
  const emailWQuoteButNoDots = 'just"not"right@example.com'
  it(`Emails with quotes that are not the only thing but not seperated by dots are invalid. (${emailWQuoteButNoDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButNoDots)).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotesNoBackslash =
    'this is"notallowed@example.com'
  it(`Emails with spaces, quotes, and backslashes outside of a quotes and not proceeded by a backslash are invalid. (${emailWSpacesQuotesBackslashOutsideQuotesNoBackslash})`, async () =>
    expect(
      await emailValidator.validate(
        emailWSpacesQuotesBackslashOutsideQuotesNoBackslash
      )
    ).to.equal(false))
  const emailWSpacesQuotesBackslashOutsideQuotes =
    'this still"not\\allowed@example.com'
  it(`Emails with spaces, quotes, and backslashes outside of a quotes are invalid. (${emailWSpacesQuotesBackslashOutsideQuotes})`, async () =>
    expect(
      await emailValidator.validate(emailWSpacesQuotesBackslashOutsideQuotes)
    ).to.equal(false))
  const emailWTooLongLocal =
    '1234567890123456789012345678901234567890123456789012345678901234+x@example.com'
  it(`Emails with more than 64 chars are invalid. (${emailWTooLongLocal})`, async () =>
    expect(await emailValidator.validate(emailWTooLongLocal)).to.equal(false))
  const emailWUnderscoredDomain =
    'i_like_underscore@but_its_not_allowed_in_this_part.example.com'
  it(`Emails with underscores in the domain are invalid. (${emailWUnderscoredDomain})`, async () =>
    expect(await emailValidator.validate(emailWUnderscoredDomain)).to.equal(
      false
    ))
  const emailWIconCharacters = 'QA☕CHOCOLATE☕@test.com'
  it(`Emails with icon characters invalid. (${emailWIconCharacters})`, async () =>
    expect(await emailValidator.validate(emailWIconCharacters)).to.equal(false))
  const emailWPeriodNearEnd = 'james@google.c'
  it(`Emails with periods that are less than 2 chars from the end of the domain are invalid. (${emailWPeriodNearEnd})`, async () =>
    expect(await emailValidator.validate(emailWPeriodNearEnd)).to.equal(false))
  const emailWPeriodNearBeginning = 'james@g.com'
  it(`Emails with periods that are less than 1 chars from the domain beginning are invalid. (${emailWPeriodNearBeginning})`, async () =>
    expect(await emailValidator.validate(emailWPeriodNearBeginning)).to.equal(
      false
    ))
  const emailWSpaceButNoQuotes = 'james richards@google.com'
  it(`Emails with spaces but no quotes are invalid. (${emailWSpaceButNoQuotes})`, async () =>
    expect(await emailValidator.validate(emailWSpaceButNoQuotes)).to.equal(
      false
    ))
  const emailWSpaceButOnlyQuoteBefore = 'james" richards@google.com'
  it(`Emails with spaces but only a quote before or after are invlaid. (${emailWSpaceButOnlyQuoteBefore})`, async () =>
    expect(
      await emailValidator.validate(emailWSpaceButOnlyQuoteBefore)
    ).to.equal(false))
  const emailWInvalidDomainChars = 'james@cb$.com'
  it(`Emails with invalid chars in the domain are invalid. (${emailWInvalidDomainChars})`, async () =>
    expect(await emailValidator.validate(emailWInvalidDomainChars)).to.equal(
      false
    ))
  const emailWQuoteButMissingDots = 'just."not"right@example.com'
  it(`Emails with quotes that are not the only thing but are missing some of the dots that should surround quotes are invalid. (${emailWQuoteButMissingDots})`, async () =>
    expect(await emailValidator.validate(emailWQuoteButMissingDots)).to.equal(
      false
    ))
  const doubleDotBeforeAt = 'john..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAt})`, async () =>
    expect(await emailValidator.validate(doubleDotBeforeAt)).to.equal(false))

  const doubleDotBeforeAtAndOneQuote = '"john..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndOneQuote})`, async () =>
    expect(
      await emailValidator.validate(doubleDotBeforeAtAndOneQuote)
    ).to.equal(false))
  const doubleDotBeforeAtAndTwoQuotesBeforePeriods = '"john"..doe@example.com'
  it(`Emails with 2 dots together in the local are invalid unless quoted. (${doubleDotBeforeAtAndTwoQuotesBeforePeriods})`, async () =>
    expect(
      await emailValidator.validate(doubleDotBeforeAtAndTwoQuotesBeforePeriods)
    ).to.equal(false))
  const doubleDotAfterAt = 'john.doe@example..com'
  it(`Emails with 2 dots together after the at are invalid. (${doubleDotAfterAt})`, async () =>
    expect(await emailValidator.validate(doubleDotAfterAt)).to.equal(false))
  const emailWInternalQuoteWDots = 'just."not."right@example.com'
  it(`Emails with quotes that have periods next to them but are not onside are invalid. (${emailWInternalQuoteWDots})`, async () =>
    expect(await emailValidator.validate(emailWInternalQuoteWDots)).to.equal(
      false
    ))
  const emailInvalidTld = 'test@example.thisisnotavalidtld'
  it(`Emails that are non-icann tlds invalid. (${emailInvalidTld})`, async () =>
    expect(await emailValidator.validate(emailInvalidTld)).to.equal(false))
})

describe('Check run time for 1000 emails.', async () => {
  const emailValidator = new EmailSyntaxValidator()

  const validEmail = 'test@google.com'
  const maxTime = 20
  it(`Valid emails run 1000 times should take less than ${maxTime} milliseconds.`, async () => {
    const startTime = performance.now()
    const promises = []
    for (let i = 0; i < 1000; i += 1) {
      promises.push(emailValidator.validate(validEmail))
    }
    await Promise.all(promises)
    const endTime = performance.now()

    console.log(`Valid emails took ${endTime - startTime} milliseconds`)

    return expect(endTime - startTime).to.be.below(maxTime)
  })
  const invalidEmail = 'invalid@cb$.com'
  it(`Invalid emails run 1000 times should take less than ${maxTime} milliseconds.`, async () => {
    const startTime = performance.now()
    const promises = []
    for (let i = 0; i < 1000; i += 1) {
      promises.push(emailValidator.validate(invalidEmail))
    }
    await Promise.all(promises)
    const endTime = performance.now()

    console.log(`Invalid emails took ${endTime - startTime} milliseconds`)

    return expect(endTime - startTime).to.be.below(maxTime)
  })
})
