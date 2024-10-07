const idDto = ({
  id = '1234'
} = {}) => Object.freeze({
  OrgId: {
    AnyBIC: 'J5BMVH7D',
    Othr: {
      Id: id
    }
  }
})

const acctDto = () => Object.freeze({
  Id: {
    ...idDto(),
    IBAN: 'PT123' // add to idDto?
  },
  SchmeNm: {
    Cd: 'BIC',
    Prtry: '123'
  },
  Issr: 'BIC'
})

const agtDto = () => Object.freeze({
  FinInstnId: {
    BICFI: 'J5BMVH7D'
  },
  BrnchId: {
    Id: '123'
  }
})

const ctctDtlsDto = ({ Nm = 'Contact Name' } = {}) => Object.freeze({
  Nm,
  PhneNb: '+123-123-321',
  MobNb: '+123-123-321',
  FaxNb: '+123-123-321',
  EmailAdr: 'assignor@example.com'
})

const pstlAdrDto = () => Object.freeze({
  AdrTp: {
    Cd: 'ADDR'
  },
  Dept: 'Dept',
  SubDept: 'SubDept',
  StrtNm: 'StrtNm',
  BldgNb: 'BldgNb',
  BldgNm: 'BldgNm',
  Flr: 'Flr',
  PstBx: 'PstBx',
  Room: 'Room',
  PstCd: 'PstCd',
  TwnNm: 'TwnNm',
  TwnLctnNm: 'TwnLctnNm',
  DstrctNm: 'DstrctNm',
  CtrySubDvsn: 'CtrySubDvsn',
  Ctry: 'BE',
  AdrLine: 'AdrLine'
})

const party40ChoiceDto = ({
  Id = idDto(),
  Nm = 'Party Name'
} = {}) => Object.freeze({
  Pty: {
    Id,
    Nm,
    PstlAdr: pstlAdrDto(),
    CtryOfRes: 'BE',
    CtctDtls: ctctDtlsDto({ Nm })
  }
})

const assgnmtDto = () => ({
  MsgId: '123',
  CreDtTm: '2020-01-01T00:00:00Z',
  Assgnr: party40ChoiceDto(),
  Assgne: party40ChoiceDto()
})

const rptDto = () => Object.freeze({
  OrgnlId: '1234567890123456',
  Vrfctn: true,
  OrgnlPtyAndAcctId: {
    ...party40ChoiceDto(),
    Acct: acctDto(),
    Agt: agtDto()
  },
  UpdtdPtyAndAcctId: {
    ...party40ChoiceDto(),
    Acct: acctDto(),
    Agt: agtDto()
  }
})

const isoPartiesPutPayloadDto = () => Object.freeze({
  Assgnmt: assgnmtDto(),
  Rpt: rptDto()
})

module.exports = {
  isoPartiesPutPayloadDto,
  assgnmtDto,
  rptDto,
  party40ChoiceDto,
  pstlAdrDto,
  ctctDtlsDto,
  idDto
}
