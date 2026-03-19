import { Component } from '@angular/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nosotros',
  templateUrl: './nosotros.component.html',
  styleUrls: ['./nosotros.component.css']
})
export class NosotrosComponent {

  

  constructor() {
    // Rotación automática del slider cada 4 segundos
    
  }

  

  mostrarLocales() {
    Swal.fire({
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
            <strong>Horarios: Lunes a Sábado de 10 a 20hs</strong>
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
      title: '¿Cómo comprar en nuestro sitio?',
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
            3. Continúa en finalizar compra donde mediante una transferencia inmediata pagas tu pedido.<br>
            4. Completa nuestro formulario con algunos datos. <strong>Aquí deberás sumar el comprobante de la transferencia para validarlo.</strong>.<br><br>
            5. Confirma el pago y tu pedido pasará a estar pendiente de compra.<br>
            6. Podrás acceder a tus compras mediante tu DNI o número de pedido que se te proporcionará para ver el estado de tu compra.<br>
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