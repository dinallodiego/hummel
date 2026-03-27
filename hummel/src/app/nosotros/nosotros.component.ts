import { Component } from '@angular/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nosotros',
  templateUrl: './nosotros.component.html',
  styleUrls: ['./nosotros.component.css'],
})
export class NosotrosComponent {
  constructor() {
    // Rotación automática del slider cada 4 segundos
  }

  swalBase = {
    customClass: {
      popup: 'swal-popup',
      title: 'swal-title',
      confirmButton: 'swal-confirm',
      cancelButton: 'swal-cancel',
      input: 'swal-input',
    },
    buttonsStyling: false,
    width: '100%',
    padding: '1.2rem',
    backdrop: 'rgba(0,0,0,0.5)',
  };

  mostrarLocales() {
    Swal.fire({
      ...this.swalBase,
      title: 'Nuestros Locales',
      html: `
        <div style="display:flex; flex-direction:column; gap:12px">
  
          <div style="
            border:1px solid #eee;
            border-radius:12px;
            padding:14px;
            background:#fafafa;
          ">
            <div style="font-weight:600; font-size:15px; margin-bottom:4px;">
              📍 Ramos Mejía
            </div>
  
            <div style="font-size:13px; color:#555; line-height:1.5;">
              Belgrano 69<br>
              Local 26<br>
              Galería Gran Rivadavia<br>
              <strong>Horarios:</strong><br><br> 
              <strong>Martes a Viernes</strong> de 10:30 hs a 19:30 hs <br> <br> 
              <strong>Sabados</strong> de 10:30 hs a 15 hs <br><br> 
              <strong>Lunes y feriados cerrado</strong>
            </div>
          </div>
  
          <a 
            href="https://www.google.com/maps/search/?api=1&query=Belgrano+69+Ramos+Mejia"
            target="_blank"
            style="
              text-decoration:none;
              text-align:center;
              padding:10px;
              border-radius:999px;
              background:#111;
              color:white;
              font-size:14px;
            "
          >
            Ver en Google Maps
          </a>
  
        </div>
      `,
      confirmButtonText: 'Cerrar',
    });
  }

  mostrarPoliticasDeCompra() {
    Swal.fire({
      ...this.swalBase,
      title: '¿Como comprar en nuestro sitio?',
      html: `
        <div style="display:flex; flex-direction:column; gap:12px">
  
          <div style="
            border:1px solid #eee;
            border-radius:12px;
            padding:14px;
            background:#fafafa;
          ">
            <div style="font-size:13px; color:#555; line-height:1.5;">
              1. Explora nuestro catálogo y elige tus productos favoritos.<br>
              2. Agrega los productos a tu carrito de compras.<br>
              3. Continua en finalizar compra donde mediante una transferencia inmediata pagas tu pedido.<br>
              4. Completas nuestro formulario con algunos datos. <strong>Aqui deberas sumar el comprobante de la transferencia para validarlo.</strong>.<br><br>
              5. Confirma el pago y tu pedido pasara a estar pendiente de compra.<br>
              6. Podras acceder a tus compras mediante tu DNI o numero de pedido que se te proporcionará para ver el estado de tu compra.<br>
              7. Una vez validada la transferencia, preparamos tu pedido para su envío o retiro en local.<br>
              8. Recibe tu pedido en la comodidad de tu hogar o retíralo en nuestro local.<br><br>
              Si tienes alguna pregunta, no dudes en contactarnos. ¡Gracias por elegirnos para tus compras!
            </div>
          </div>
  
        </div>
      `,
      confirmButtonText: 'Cerrar',
    });
  }
}
