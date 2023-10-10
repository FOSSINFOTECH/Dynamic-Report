# See LICENSE file for full copyright and licensing details.
from odoo import fields, models


class ResCompany(models.Model):
    _inherit = "account.analytic.account"

    is_plant = fields.Boolean(string="Plant")
