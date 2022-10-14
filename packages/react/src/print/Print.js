import './print.less';
import header from "../assets/img/ft_intestazione.gif";
import paziente from "../assets/img/dati_paziente.gif";
import esamigif from "../assets/img/esami_effettuati.gif";
import { Button, Col, Row, Space } from "antd";
import React, { useRef } from "react";
import ReactToPrint from "react-to-print";
import { Format } from "../data/formatter/dataFormatter";


export const Printer = ({document: Document, data}) => {
    const ref = useRef();
    data.ref = ref;
    console.log(document, data);
    //const Content = React.cloneElement(document, data);
    return (
      <div>
        <ReactToPrint
          trigger={() => <Button>STAMPA</Button>}
          content={() => ref.current}
        />
        <Document {...data} ref={ref} />
      </div>
    );
};
/*export const ComponentToPrint = React.forwardRef((props, ref) => {
    return (
      <div ref={ref}>My cool content here!</div>
    );
  });*/

export const PrintInvoice = React.forwardRef(({invoice}, ref) => {

    const esami = invoice.items
        ? invoice.items.map((exam) =>
            <Row className="p-value">
                <Col span={4}>{exam.id}</Col><Col span={15}>{exam.title}</Col><Col span={3} style={{textAlign: 'right'}}>{exam.price}</Col>
            </Row>
        ) : null;
    return (
        <div ref={ref} className="invoice">
            <img src={header} alt="intestazione Fattura" />
            <Space><h2>RICEVUTA SANITARIA</h2> <span className="p-title">Numero</span><span className="p-value">{invoice.invid + '/' + invoice.date.getFullYear()}</span> <span className="p-title">del</span><span className="p-value">{Format.moment(invoice.date, 'L')}</span></Space>
            <img src={paziente} alt="Dati Paziente" />
            <Row>
                <Col span={3} className="p-title">Codice Paziente : </Col><Col span={9} className="p-value">{invoice.idpatient}</Col>
            </Row>
            <Row>
                <Col span={3} className="p-title">Codice Cartella : </Col><Col span={9} className="p-value">{invoice.idfolder}</Col><Col span={12}>Egr. Sig.</Col>
            </Row>
            <Row>
                <Col span={3} className="p-title">Codice Fiscale : </Col><Col span={9} className="p-value">{invoice.fiscalcode}</Col><Col span={12} className="p-value">{invoice.fullname}</Col>
            </Row>
            <Row>
                <Col span={12}></Col><Col span={12} className="p-value">{invoice.street}</Col>
            </Row>
            <Row>
                <Col span={12}></Col><Col span={12} className="p-value">{invoice.locality + ' (' + invoice.city + ')'}</Col>
            </Row>
            <img src={esamigif} alt="Prestazioni effettuate" />
            <Row className="p-title">
                <Col span={4} >Esame</Col><Col span={15}>Descrizione</Col><Col span={3} style={{textAlign: 'right'}}>Da Pagare</Col>
            </Row>
            {esami}
            <Row style={{marginTop: '8px'}}>
                <Col span={19} className="p-title">Totale esami a carico del paziente</Col><Col span={3}  className="p-value" style={{textAlign: 'right'}}>{invoice.taxable}</Col>
            </Row>
            {invoice.tax && 
            <Row>
                <Col span={19} className="p-title">Importo bollo sull'originale</Col><Col span={3} className="p-value" style={{textAlign: 'right'}}>{invoice.tax}</Col>
            </Row>}
            <Row>
            <Col span={19}  className="p-title">Totale fattura</Col><Col span={3} className="p-value" style={{textAlign: 'right'}}>{invoice.total}</Col>
            </Row>
            <Row className="p-title" style={{marginTop: '8px'}}>
            <Col span={10} ></Col><Col span={12} style={{textAlign: 'right'}}>Totale esami esente I.V.A. Art. 10/18 D.P.R. 633/12 e succ. mod.</Col>
            </Row>
        </div>
    )
});

const esito = ['SOSPESO', 'IDONEO', 'NON IDONEO']
export const PrintCompetitiveCertificate = React.forwardRef(({certificate}, ref) => {//({ certificate }) {

    return (
        <div ref={ref} className="cert">
            <img src={header} alt="Intestazione Certificato Agonistico" />
            <Row>
                <Col span={15}><h2>Cert. N. {certificate.certid + '/' + new Date().getFullYear()}</h2></Col>
                <Col span={9}><h2>Acc. ASL n° 5184 del 26/04/2017</h2></Col>
            </Row>
            
            <h2>CERTIFICAZIONE DI IDONEITÀ</h2>
            <h2>ALL'ATTIVITÀ SPORTIVA AGONISTICA</h2>
            <h2>(D.M. 18-2-1982 - L.R. 9/7/2003 n° 35)</h2>
            <p style={{textAlign: 'justify'}}>Si dichiara che l'atleta <span className="c-value">{certificate.fullname.toUpperCase()}</span> nato/a a <span className="c-value">{certificate.blocality.toUpperCase()}</span> il <span className="c-value">{certificate.dborn}</span> residente a <span className="c-value">{certificate.locality.toUpperCase()}</span> in <span className="c-value">{certificate.street.toUpperCase()} </span>
                documento n° <span className="c-value">{certificate.ndoc}</span> rilasciato da <span className="c-value">{certificate.fromdoc}</span> il <span className="c-value">{Format.moment(certificate.ddoc, 'L')}</span> è stato sottoposto a visita in data <span className="c-value">{Format.moment(certificate.date, 'L')}</span> con esecuzione degli
                accertamenti previsti dal D.M. 18.02.82 (Tab. A - Tab. B), ed è stato dichiarato <span className="c-value">{esito[certificate.istate]}</span> alla pratica agonistica dello sport <span className="c-value">{certificate.sport.toUpperCase()}</span>. Il predetto certificato
                ha validità di <span className="c-value">{certificate.certwidth}</span> Mesi con scadenza il <span className="c-value">{Format.moment(certificate.expiry, 'L')}</span>.
            </p>
            <Row>
                <Col span={16}>Firma dell' atleta</Col><Col span={8}>Il medico</Col>
            </Row>
            <Row style={{marginTop: '24px'}}>
                <Col span={8}>_________________________________</Col><Col span={8}>Timbro della struttura</Col><Col span={8}>_________________________________</Col>
            </Row>
            <h4 style={{marginTop: '32px'}}>AVVERTENZA</h4>
            <p style={{textAlign: 'justify'}}>Contro il giudizio di <span>NON IDONEITÀ</span> è ammesso il ricorso entro 30 giorni dal ricevimento della presente comunicazione mediante inoltro con 
            raccomandata alla Commissione Regionale di Appello presso Azienda Ospedaliera Universitaria Careggi, SOD Medicina dello sport e dell'esercizio fisico (Via delle
            Oblate, 4 - Padiglione 28C - Ponte Nuovo, Careggi - 50141 Firenze)</p>
        </div>
    )
});

export const PrintCertificate = React.forwardRef(({certificate}, ref) => {//({ certificate }) {
    return (
        <div ref={ref} className="cert">
            <img src={header} alt="Intestazione Certificato Non Agonistico" />
            <h2>CERTIFICAZIONE DI IDONEITÀ ALLA PRATICA</h2>
            <h2>DI ATTIVITÀ SPORTIVA DI TIPO NON AGONISTICO</h2>
            <h2>(D.M. 24-04-2013 GU n.169 del 20-7-2013)</h2>
            <p style={{textAlign: 'justify'}}>Sig.ra / Sig <span className="c-value">{certificate.fullname.toUpperCase()}</span> nata/o a <span className="c-value">{certificate.blocality.toUpperCase()}</span> il <span className="c-value">{certificate.dborn}</span> residente a <span className="c-value">{certificate.locality.toUpperCase()}</span> in <span className="c-value">{certificate.street.toUpperCase()}</span>. 
                Il soggetto, sulla base della visita medica da me effettuata, dei valori di pressione arteriosa rilevati, nonchè del referto del tracciato ECG eseguito in data
                <span className="c-value">{' ' + Format.moment(certificate.certdate, 'L')}</span>, non presenta controindicazioni in atto alla pratica di attività sportiva non agonistica.
            </p>
            <p>Il presente certificato ha validità annuale dalla data del rilascio.</p>
            <p>Luogo, data, timbro e firma del medico certificatore</p>
        </div>
    )
});

